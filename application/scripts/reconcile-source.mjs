import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const key=(await readFile('.data/bridge-key','utf8')).trim();const seed=JSON.parse(await readFile('data/catalog-seed.json','utf8'));
async function sql(statements){const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:JSON.stringify({statements})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
const report={corrected:[],protected:[],aliases:[],quarantinedSections:[]};
for(const o of seed.offerings){const [r]=await sql([{sql:'SELECT editor_modified,working_data FROM offerings WHERE id=$1',params:[o.id]}]);if(!r.rows.length)continue;if(r.rows[0].editor_modified){report.protected.push(o.id);continue;}
 const data=structuredClone(o.data);
 if(o.type==='tour')for(const [lang,t]of Object.entries(data.translations)){
  // Do not republish disputed legal/payment terms or generic one-day programmes as confirmed multi-day itineraries.
  const boundary=t.body.findIndex(p=>['BOOKING CONDITIONS','УСЛОВИЯ БРОНИРОВАНИЯ','Условия бронирования'].includes(p));if(boundary>=0){const removed=t.body.splice(boundary);report.quarantinedSections.push({id:o.id,locale:lang,reason:'Source booking terms need operator/legal confirmation',paragraphs:removed.length});await sql([{sql:"INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$2,$3,$4::jsonb) ON CONFLICT(source_id,field) DO NOTHING",params:[randomUUID(),o.id,`conditions.${lang}`,JSON.stringify({reason:'Unconfirmed source legal/booking conditions',raw:removed})]}]);}
  if(data.duration?.unit==='days'){const generic=t.body.findIndex(p=>['ABOUT TOUR','О ТУРЕ'].includes(p));if(generic>=0){const removed=t.body.splice(generic);report.quarantinedSections.push({id:o.id,locale:lang,reason:'Generic programme not a verified daily itinerary',paragraphs:removed.length});await sql([{sql:"INSERT INTO conflicts(id,offering_id,source_id,field,detail) VALUES($1,$2,$2,$3,$4::jsonb) ON CONFLICT(source_id,field) DO NOTHING",params:[randomUUID(),o.id,`program.${lang}`,JSON.stringify({reason:'Programme requires daily itinerary confirmation',raw:removed})]}]);}}
 }
 await sql([{sql:'UPDATE offerings SET working_data=$1::jsonb,published_data=$1::jsonb,updated_at=now() WHERE id=$2 AND NOT editor_modified',params:[JSON.stringify(data),o.id]}]);report.corrected.push(o.id);
}
for(const slug of ['nhatrang-enduro-tour-advanced','nhatrang-enduro-tour-one-day','three-day-tour-dalat-nhatrang']){const path='/'+slug;await sql([{sql:"UPDATE url_registry SET kind='offering',offering_id=$1 WHERE path=$2",params:['tour-'+slug,path]}]);report.aliases.push(path);}
await writeFile('.shipstudio/source-reconciliation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({corrected:report.corrected.length,protected:report.protected.length,aliases:report.aliases.length,quarantinedSections:report.quarantinedSections.length}));
