import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {migrate} from '../server/database.mjs';
const order=['organizations','users','memberships','destinations','categories','offerings','revisions','media','url_registry','import_runs','import_rows','conflicts','audit_log','leads','lead_events','outbox','rate_limits','invitations','recovery_tokens','sessions'];
const key=(await readFile('.data/bridge-key','utf8')).trim();
async function sql(statements){const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:key,'content-type':'application/json'},body:JSON.stringify({statements})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
await mkdir('.data/backups',{recursive:true,mode:0o700});let encryption;
try{encryption=await readFile('.data/backup-key');}catch{encryption=randomBytes(32);await writeFile('.data/backup-key',encryption,{mode:0o600,flag:'wx'});}
const results=await sql([{sql:'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ'},{sql:"SELECT table_name,column_name,udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY ordinal_position"},...order.map(t=>({sql:`SELECT * FROM ${t}`}))]);
const snapshot={at:new Date().toISOString(),columns:results[1].rows,tables:Object.fromEntries(order.map((t,i)=>[t,results[i+2].rows])),media:[],assetHashes:[]};
for(const m of snapshot.tables.media){const file=await readFile('.data'+m.path);snapshot.media.push({path:m.path,sha256:createHash('sha256').update(file).digest('hex'),data:file.toString('base64')});}
const assets=new Set();for(const o of snapshot.tables.offerings)for(const d of [o.working_data,o.published_data])for(const photo of d?.photos??[])if(photo.src.startsWith('/assets/'))assets.add(photo.src);
for(const path of assets){const bytes=await readFile('public'+path);snapshot.assetHashes.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryption,iv),encrypted=Buffer.concat([cipher.update(JSON.stringify(snapshot)),cipher.final()]);const artifact=Buffer.concat([iv,cipher.getAuthTag(),encrypted]);
const name=`.data/backups/catalog-${snapshot.at.replace(/[:.]/g,'-')}.enc`;await writeFile(name,artifact,{mode:0o600});
const started=Date.now(),saved=await readFile(name),decipher=createDecipheriv('aes-256-gcm',encryption,saved.subarray(0,12));decipher.setAuthTag(saved.subarray(12,28));const restored=JSON.parse(Buffer.concat([decipher.update(saved.subarray(28)),decipher.final()]).toString());
const target=new PGlite();await migrate(target);const checks=[];
try{
 await target.transaction(async tx=>{for(const t of order){if(['sessions','invitations','recovery_tokens'].includes(t))continue;for(const row of restored.tables[t]){const keys=Object.keys(row);const params=keys.map(k=>restored.columns.find(c=>c.table_name===t&&c.column_name===k)?.udt_name==='jsonb'?JSON.stringify(row[k]):row[k]);await tx.query(`INSERT INTO ${t}(${keys.map(k=>`"${k}"`).join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')})`,params);}}});
 for(const t of order){const count=(await target.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;const expected=['sessions','invitations','recovery_tokens'].includes(t)?0:restored.tables[t].length;checks.push({name:`Restore ${t}`,passed:count===expected,count,expected});}
 for(const m of restored.media)checks.push({name:'Private media checksum',passed:createHash('sha256').update(Buffer.from(m.data,'base64')).digest('hex')===m.sha256});
 for(const a of restored.assetHashes)checks.push({name:'Archived public asset checksum',passed:createHash('sha256').update(await readFile('public'+a.path)).digest('hex')===a.sha256});
 const published=(await target.query('SELECT count(*)::int AS n FROM offerings WHERE published_data IS NOT NULL')).rows[0].n;checks.push({name:'Published offerings restored',passed:published===restored.tables.offerings.filter(o=>o.published_data!==null).length});
}finally{await target.close();}
const report={checkedAt:new Date().toISOString(),artifact:name,encrypted:true,externalStorageTested:false,realDeliveryEnabled:false,restoredTo:'isolated in-memory PostgreSQL',restoreSeconds:(Date.now()-started)/1000,sessionsAndInvitationsRevoked:true,checks,errors:checks.filter(c=>!c.passed)};
await writeFile('.shipstudio/backup-restore-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({encryptedBackup:name,checks:checks.length,errors:report.errors.length,restoreSeconds:report.restoreSeconds,externalStorageTested:false}));if(report.errors.length)process.exitCode=1;
