import {openDatabase,migrate} from './database.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {runSQL} from './sql-client.mjs';
if(process.env.DATABASE_URL){const db=await openDatabase();try{await migrate(db);console.log('PostgreSQL migrations applied');}finally{await db.end();}}
else {for(const name of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){const [r]=await runSQL([{sql:'SELECT id FROM schema_migrations WHERE id=$1',params:[name]}]);if(r.rows.length)continue;const sql=await readFile('db/migrations/'+name,'utf8');await runSQL([...sql.split('-- statement-break').map(sql=>({sql})),{sql:'INSERT INTO schema_migrations(id) VALUES($1)',params:[name]}]);}console.log('Private local PostgreSQL migrations applied');}
