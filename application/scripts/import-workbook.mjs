import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {runSQL} from '../server/sql-client.mjs';
import {offeringDataSchema} from '../lib/offering-validation.ts';
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
const apply=process.argv.includes('--apply'),prepared=JSON.parse(await readFile('.shipstudio/workbook-prepared.json','utf8')),assets=JSON.parse(await readFile('content/assets.json','utf8')),source=JSON.parse(await readFile('.shipstudio/workbook-source.json','utf8')),audit=JSON.parse(await readFile('.shipstudio/workbook-audit.json','utf8'));
const runId=randomUUID(),report={checkedAt:new Date().toISOString(),source:audit.source,sourceSha256:audit.sha256,dryRun:!apply,created:[],updated:[],unchanged:[],protected:[],errors:[],changes:[]},before=[],applied=[];
await mkdir('.data/imports',{recursive:true,mode:0o700});
const statements=[];
for(const item of prepared){
 let data=structuredClone(item.data);const [result]=await runSQL([{sql:'SELECT * FROM offerings WHERE id=$1',params:[item.id]}]),existing=result.rows[0];
 if(existing){const current=structuredClone(existing.working_data);if(item.type==='rental'){for(const key of ['translations','commerce','tariffs','deposit','vehicle'])current[key]=data[key];}else{for(const key of ['commerce','routes','groupSize','program','level'])if(key in data)current[key]=data[key];if(item.id==='tour-vietnam-motorcycle-tours-12-days')current.translations=data.translations;}data=current;}
 const urls=item.workbook.photos??[];
 if(urls.length)data.photos=urls.map(url=>{const src=assets[url];if(!src)throw new Error('Unlocalized workbook photo');return {src,alt:{ru:data.translations.ru?.title??data.translations.en.title,en:data.translations.en?.title??data.translations.ru.title},rights:'Source supplied by owner; original inventory photo'};});
 offeringDataSchema.parse(data);
 for(const photo of data.photos){await readFile('public'+photo.src);}
 const fingerprint=createHash('sha256').update(JSON.stringify(stable({source:audit.sha256,id:item.workbook.id,data}))).digest('hex');item.data=data;item.hash=fingerprint;
 const same=existing&&JSON.stringify(stable(existing.working_data))===JSON.stringify(stable(data))&&existing.source_hash===fingerprint;
 const outcome=existing?.editor_modified?'protected':same?'unchanged':existing?'updated':'created';report[outcome].push(item.id);
 report.changes.push({id:item.id,outcome,fields:existing?Object.keys(data).filter(k=>JSON.stringify(data[k])!==JSON.stringify(existing.working_data[k])):Object.keys(data)});
 if(outcome==='updated'){before.push(existing);statements.push({sql:'UPDATE offerings SET working_data=$1::jsonb,published_data=$1::jsonb,source_hash=$2,version=version+1,updated_at=now(),published_at=now() WHERE id=$3 AND version=$4 AND NOT editor_modified',params:[JSON.stringify(data),fingerprint,item.id,existing.version]});}
 if(outcome==='created')statements.push({sql:"INSERT INTO offerings(id,organization_id,type,category_id,destination_id,slug,status,working_data,published_data,source_id,source_hash,published_at) VALUES($1,'enduro-vietnam',$2,$3,$4,$5,'published',$6::jsonb,$6::jsonb,$7,$8,now())",params:[item.id,item.type,item.category,item.destination,item.slug,JSON.stringify(data),item.sourceId,fingerprint]});
 if(['created','updated'].includes(outcome)){
  const [owner]=await runSQL([{sql:"SELECT id FROM users WHERE active AND role='owner' ORDER BY created_at LIMIT 1"}]);if(!owner.rows.length)throw new Error('Owner required for revision provenance');
  statements.push({sql:"INSERT INTO revisions(id,offering_id,version,author_id,state,data,note) VALUES($1,$2,$3,$4,'published',$5::jsonb,$6)",params:[randomUUID(),item.id,(existing?.version??0)+1,owner.rows[0].id,JSON.stringify(data),'Owner-authorized workbook reconciliation '+audit.sha256]});
  for(const [locale,path] of Object.entries(data.routes))statements.push({sql:"INSERT INTO url_registry(path,locale,kind,offering_id,source_status) VALUES($1,$2,'offering',$3,200) ON CONFLICT(path) DO UPDATE SET kind='offering',target=NULL,offering_id=excluded.offering_id WHERE url_registry.offering_id=excluded.offering_id OR url_registry.kind='gone'",params:[path,locale,item.id]});
  applied.push(item);
 }
 const row=source.sheets.find(s=>s.name===item.workbook.sheet)?.rows.find(r=>r.row===item.workbook.row);
 statements.push({sql:'INSERT INTO import_rows(id,run_id,source_id,source_hash,source_file,raw_data,parsed_data,outcome) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)',params:[randomUUID(),runId,item.sourceId,fingerprint,item.sourceFile,JSON.stringify(row??item.workbook),JSON.stringify(data),outcome]});
 if(outcome==='protected')statements.push({sql:"INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$3,'workbook-import',$4::jsonb) ON CONFLICT(source_id,field) DO UPDATE SET detail=excluded.detail",params:[randomUUID(),item.id,item.sourceId,JSON.stringify({reason:'Editor-modified record preserved',incoming:data,source:audit.sha256})]});
}
if(apply){
 await writeFile('.data/imports/workbook-before-'+runId+'.json',JSON.stringify(before,null,2)+'\n',{mode:0o600});
 await runSQL([{sql:'INSERT INTO import_runs(id,source,dry_run,summary) VALUES($1,$2,false,$3::jsonb)',params:[runId,audit.source,JSON.stringify(report)]},...statements]);
 const seed=JSON.parse(await readFile('data/catalog-seed.json','utf8'));
 for(const item of applied){const at=seed.offerings.findIndex(o=>o.id===item.id);item.raw={source:audit.source,sha256:audit.sha256,...item.workbook};if(at>=0)seed.offerings[at]=item;else seed.offerings.push(item);}
 seed.workbookSource={name:audit.source,sha256:audit.sha256};await writeFile('data/catalog-seed.json',JSON.stringify(seed,null,2)+'\n');
 for(const issue of audit.issues){const target=prepared.find(o=>o.workbook.id===issue.id&&o.workbook.sheet===issue.sheet)??prepared.find(o=>o.id==='tour-vietnam-motorcycle-tours-12-days');await runSQL([{sql:'INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(source_id,field) DO UPDATE SET detail=excluded.detail',params:[randomUUID(),target?.id??null,'workbook:'+audit.sha256,`${issue.sheet}:${issue.id??issue.row??''}:${issue.kind}:${issue.raw??issue.url??''}`,JSON.stringify(issue)]}]);}
}
await writeFile('.shipstudio/workbook-'+(apply?'import':'dry-run')+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,Array.isArray(v)?v.length:v]))));
