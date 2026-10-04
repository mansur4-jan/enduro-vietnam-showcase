import { readFile,writeFile,mkdir } from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {runSQL} from '../server/sql-client.mjs';
await mkdir('.shipstudio',{recursive:true});
const seed=JSON.parse(await readFile(process.env.IMPORT_FILE ?? 'data/catalog-seed.json','utf8'));
const apply=process.argv.includes('--apply'),runId=randomUUID();
const report={runId,dryRun:!apply,source:process.env.IMPORT_FILE??'archived source + supplied TZ_v1',mapping:{id:'source_id',hash:'source_hash',data:'working_data / published_data',raw:'import_rows.raw_data'},created:[],unchanged:[],protected:[],quarantined:[...(seed.quarantine??[])].map(({raw,...r})=>r),conflicts:seed.conflicts.length};
const seen=new Set();const statements=[];
for(const o of seed.offerings){
 if(seen.has(o.sourceId)||!seed.categories.some(c=>c.id===o.category)||!seed.destinations.some(d=>d.id===o.destination)||!o.id||!o.slug||!['tour','rental','activity'].includes(o.type)||!o.data.translations||Object.values(o.data.translations).some(t=>!t.title)) {report.quarantined.push({id:o.sourceId,error:'Invalid or duplicate source record'});continue;}seen.add(o.sourceId);
 const rows=(await runSQL([{sql:'SELECT source_hash,editor_modified FROM offerings WHERE source_id=$1',params:[o.sourceId]}]))[0].rows;
 const existing=rows[0];const outcome=!existing?'created':existing.source_hash===o.hash?'unchanged':'protected';report[outcome].push(o.id);
 if(outcome==='created')statements.push({sql:"INSERT INTO offerings(id,organization_id,type,category_id,destination_id,slug,status,published_data,working_data,source_id,source_hash,published_at) VALUES($1,'enduro-vietnam',$2,$3,$4,$5,$9,CASE WHEN $9='published' THEN $6::jsonb ELSE NULL END,$6::jsonb,$7,$8,CASE WHEN $9='published' THEN now() ELSE NULL END)",params:[o.id,o.type,o.category,o.destination,o.slug,JSON.stringify(o.data),o.sourceId,o.hash,seed.publicationState??'published']});
 if(outcome==='protected')statements.push({sql:"INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$3,'import',$4::jsonb) ON CONFLICT(source_id,field) DO UPDATE SET detail=excluded.detail",params:[randomUUID(),o.id,o.sourceId,JSON.stringify({reason:'Changed source cannot overwrite editorial content',incoming:o.data})]});
 statements.push({sql:'INSERT INTO import_rows(id,run_id,source_id,source_hash,source_file,raw_data,parsed_data,outcome) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)',params:[randomUUID(),runId,o.sourceId,o.hash,o.sourceFile,JSON.stringify(o.raw),JSON.stringify(o.data),outcome]});
}
if(apply){
 for(const q of seed.quarantine??[])statements.push({sql:'INSERT INTO import_rows(id,run_id,source_id,source_hash,source_file,raw_data,outcome,error) VALUES($1,$2,$3,$4,$5,$6::jsonb,\'quarantined\',$7)',params:[randomUUID(),runId,q.sourceId??`quarantine:${q.fingerprint}`,q.fingerprint,process.env.IMPORT_FILE??'CSV',JSON.stringify(q.raw),q.error]});
 const dependencies=[];
 for(const o of seed.organizations)dependencies.push({sql:'INSERT INTO organizations(id,name,slug,source) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',params:[o.id,o.name,o.slug,o.source]});
 for(const d of seed.destinations)dependencies.push({sql:'INSERT INTO destinations(id,names,aliases) VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO NOTHING',params:[d.id,JSON.stringify(d.names),d.aliases]});
 for(const c of seed.categories)dependencies.push({sql:'INSERT INTO categories(id,names,slug) VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO NOTHING',params:[c.id,JSON.stringify(c.names),c.slug]});
 await runSQL([{sql:'INSERT INTO import_runs(id,source,dry_run,summary) VALUES($1,$2,false,$3::jsonb)',params:[runId,report.source,JSON.stringify(report)]},...dependencies,...statements]);
 const urls=JSON.parse(await readFile('content/routes.json','utf8')).routes;
 const mappings=[];
 for(const [path,r] of Object.entries(urls)){const o=seed.offerings.find(o=>Object.values(o.data.routes).includes(path));mappings.push({sql:'INSERT INTO url_registry(path,locale,kind,offering_id,target,source_status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(path) DO NOTHING',params:[path,path.startsWith('/ru')?'ru':'en',r.target&&r.target!==path?'redirect':o?'offering':r.sourceStatus===200?'page':'gone',o?.id??null,r.target,r.sourceStatus]});}
 for(const o of seed.offerings)for(const [locale,path]of Object.entries(o.data.routes))mappings.push({sql:"INSERT INTO url_registry(path,locale,kind,offering_id,source_status) VALUES($1,$2,'offering',$3,200) ON CONFLICT(path) DO NOTHING",params:[path,locale,o.id]});
 for(const c of seed.conflicts)mappings.push({sql:'INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$2,$3,$4::jsonb) ON CONFLICT(source_id,field) DO NOTHING',params:[randomUUID(),c.sourceId,c.field,JSON.stringify(c.detail)]});
 await runSQL(mappings);
}
await writeFile(`.shipstudio/s02-${apply?'import':'dry-run'}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({dryRun:report.dryRun,created:report.created.length,unchanged:report.unchanged.length,protected:report.protected.length,quarantined:report.quarantined.length,conflicts:report.conflicts}));
