import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {transaction} from './database.mjs';
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,allowExitOnIdle:true}):null;
export async function runSQL(statements,userId){
 if(pool)return transaction(pool,statements,userId);
 const key=(await readFile('.data/bridge-key','utf8')).trim();const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:JSON.stringify({statements,userId}),signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;
}
