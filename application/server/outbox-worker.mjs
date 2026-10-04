import {readFile} from 'node:fs/promises';
import {processOutbox} from './outbox.mjs';
import {openDatabase,transaction} from './database.mjs';
let sql,db;
if(process.env.DATABASE_URL){db=await openDatabase();sql=statements=>transaction(db,statements);}
else {const key=(await readFile('.data/bridge-key','utf8')).trim();sql=async statements=>{const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:JSON.stringify({statements})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;};}
const once=process.argv.includes('--once');let stopped=false;process.on('SIGTERM',()=>{stopped=true;});process.on('SIGINT',()=>{stopped=true;});
do {try{const report=await processOutbox(sql);if(report.claimed)console.log(JSON.stringify({at:new Date().toISOString(),...report}));}catch{console.error('Outbox database operation failed; next cycle will retry');if(once)process.exitCode=1;}if(once)break;await new Promise(r=>setTimeout(r,10000));}while(!stopped);
await db?.end?.();
