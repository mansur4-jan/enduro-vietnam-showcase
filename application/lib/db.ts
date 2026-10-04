import 'server-only';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
type Statement = {sql:string;params?:unknown[]};
type Result<T> = {rows:T[];affectedRows:number};
const globals=globalThis as typeof globalThis & {enduroPool?:Pool};
export async function batch<T=Record<string,unknown>>(statements:Statement[],userId?:string):Promise<Result<T>[]>{
  if(process.env.DATABASE_URL){
    const pool=globals.enduroPool ??=new Pool({connectionString:process.env.DATABASE_URL,max:5});
    const c=await pool.connect();
    try{await c.query('BEGIN');if(userId){await c.query("SELECT set_config('app.user_id',$1,true)",[userId]);await c.query('SET LOCAL ROLE enduro_app');}const r=[];for(const s of statements){const q=await c.query(s.sql,s.params);r.push({rows:q.rows,affectedRows:q.rowCount??0});}await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  const key=(await readFile('.data/bridge-key','utf8')).trim();
  const response=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:JSON.stringify({statements,userId}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error ?? 'Database unavailable');return data;
}
export async function query<T=Record<string,unknown>>(sql:string,params:unknown[]=[],userId?:string):Promise<T[]>{return (await batch<T>([{sql,params}],userId))[0].rows;}
