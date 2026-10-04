import {writeFile,readFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {runSQL} from '../server/sql-client.mjs';
if(process.env.DATABASE_URL)throw new Error('This fixture test is local only');
const id=`fixture-csv-${randomUUID()}`,file='.data/import-fixture.csv',prepared='.data/csv-prepared.json',checks=[];
function check(name,ok){checks.push({name,passed:!!ok});if(!ok)throw new Error(name);}
function csv(price){return `source_id,type,destination,category,slug,title_en,title_ru,price_minor,currency,unit\n${id},tour,dalat,motorbike-tours,${id},Private CSV fixture,Закрытая проверка CSV,${price},USD,\n${id}-bad,tour,dalat,motorbike-tours,${id}-bad,Invalid row,,=EXEC(),USD,\n`;}
function prepare(){execFileSync(process.execPath,['scripts/import-csv.mjs',file],{stdio:'pipe'});}
function apply(){execFileSync(process.execPath,['scripts/import-catalog.mjs','--apply'],{stdio:'pipe',env:{...process.env,IMPORT_FILE:prepared}});return JSON.parse(execFileSync(process.execPath,['-e',"process.stdout.write(require('fs').readFileSync('.shipstudio/s02-import.json'))"],{encoding:'utf8'}));}
let offering;
try{
 await writeFile(file,csv(15000),{mode:0o600});prepare();const dry=JSON.parse(await readFile('.shipstudio/csv-dry-run.json','utf8'));check('CSV dry run quarantines formula price',dry.validRows===1&&dry.quarantine.length===1);
 const first=apply();check('Only valid CSV row created',first.created.length===1);offering=first.created[0];const [r]=await runSQL([{sql:'SELECT status,published_data,working_data FROM offerings WHERE id=$1',params:[offering]}]);check('CSV creates unpublished draft',r.rows[0].status==='draft'&&r.rows[0].published_data===null);
 const second=apply();check('Repeated CSV creates no duplicates',second.created.length===0&&second.unchanged.length===1);
 await runSQL([{sql:"UPDATE offerings SET editor_modified=true,working_data=jsonb_set(working_data,'{commerce,amountMinor}','19999') WHERE id=$1",params:[offering]}]);await writeFile(file,csv(16000),{mode:0o600});prepare();const third=apply();check('Changed source protected after editorial change',third.protected.length===1);
 const [edited]=await runSQL([{sql:'SELECT working_data FROM offerings WHERE id=$1',params:[offering]}]);check('Editorial price not overwritten',edited.rows[0].working_data.commerce.amountMinor===19999);const [rows]=await runSQL([{sql:"SELECT count(*)::int AS n FROM import_rows WHERE source_id=$1 AND outcome='quarantined'",params:[id+'-bad']}]);check('Quarantine raw provenance stored',rows.rows[0].n>=1);
}finally{
 await runSQL([{sql:'DELETE FROM url_registry WHERE offering_id IN(SELECT id FROM offerings WHERE source_id=$1)',params:[id]},{sql:'DELETE FROM conflicts WHERE source_id=$1',params:[id]},{sql:'DELETE FROM offerings WHERE source_id=$1',params:[id]},{sql:'DELETE FROM import_rows WHERE source_id=ANY($1)',params:[[id,id+'-bad']]}]);for(const path of [file,prepared])try{await unlink(path);}catch{}await writeFile('.shipstudio/csv-import-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,fixturesRemoved:true},null,2)+'\n');
}
console.log(`${checks.length} CSV / quarantine / idempotency / editorial protection checks passed`);
