import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
let service,worker,next,stopping=false;
async function ready(){try{const key=(await readFile('.data/bridge-key','utf8')).trim();const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:'{"statements":[{"sql":"SELECT 1"}]}',signal:AbortSignal.timeout(1000)});return r.ok;}catch{return false;}}
if(!process.env.DATABASE_URL&&!await ready()){service=spawn(process.execPath,['server/database-service.mjs'],{stdio:'inherit'});for(let i=0;i<30&&!await ready();i++)await new Promise(r=>setTimeout(r,500));if(!await ready())throw new Error('Local PostgreSQL failed to start');}
worker=spawn(process.execPath,['server/outbox-worker.mjs'],{stdio:'inherit',env:{...process.env,DELIVERY_ENABLED:'0'}});
next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1',...process.argv.slice(2)],{stdio:'inherit'});
function stop(){if(stopping)return;stopping=true;next?.kill('SIGTERM');worker?.kill('SIGTERM');service?.kill('SIGTERM');}
process.on('SIGTERM',stop);process.on('SIGINT',stop);next.on('exit',code=>{stop();process.exitCode=code??0;});
