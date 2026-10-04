import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export async function openDatabase(directory = '.data/postgres') {
  const local = !process.env.DATABASE_URL;
  if (!local) return new pg.Pool({connectionString: process.env.DATABASE_URL, max: 5});
  await mkdir(directory, {recursive:true, mode:0o700});
  return new PGlite(resolve(directory));
}
export async function transaction(db, statements, userId) {
  const run = async client => {
    if (userId) { await client.query("SELECT set_config('app.user_id',$1,true)",[userId]); await client.query('SET LOCAL ROLE enduro_app'); }
    const results=[];
    for (const s of statements) results.push(await client.query(s.sql,s.params ?? []));
    return results;
  };
  if (db.transaction) return db.transaction(run);
  const client=await db.connect();
  try {await client.query('BEGIN'); const r=await run(client); await client.query('COMMIT'); return r;}
  catch(e){await client.query('ROLLBACK'); throw e;} finally {client.release();}
}
export async function migrate(db) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  for(const name of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){
    if((await db.query('SELECT id FROM schema_migrations WHERE id=$1',[name])).rows.length) continue;
    const sql=await readFile(`db/migrations/${name}`,'utf8');
    if(db.transaction) await db.transaction(async tx=>{await tx.exec(sql); await tx.query('INSERT INTO schema_migrations(id) VALUES($1)',[name]);});
    else {const c=await db.connect();try{await c.query('BEGIN');await c.query(sql);await c.query('INSERT INTO schema_migrations(id) VALUES($1)',[name]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  }
}
export async function bridgeSecret(){
  await mkdir('.data',{recursive:true,mode:0o700});
  try{return (await readFile('.data/bridge-key','utf8')).trim();}
  catch {const value=randomBytes(32).toString('hex');await writeFile('.data/bridge-key',value,{mode:0o600,flag:'wx'});return value;}
}
export function sameSecret(a,b){const x=Buffer.from(a ?? ''),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
