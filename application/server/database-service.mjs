import { createServer } from 'node:http';
import { openDatabase, migrate, transaction, bridgeSecret, sameSecret } from './database.mjs';
const db=await openDatabase(); await migrate(db); const key=await bridgeSecret();
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.method!=='POST'||req.url!=='/query'||!sameSecret(req.headers.authorization,key)){res.writeHead(403);res.end('{"error":"Forbidden"}');return;}
  try {
    let body='';for await(const chunk of req){body+=chunk;if(body.length>4_000_000)throw new Error('Request too large');}
    const {statements,userId}=JSON.parse(body);
    if(!Array.isArray(statements)||statements.length>500)throw new Error('Invalid transaction');
    const result=await transaction(db,statements,userId);
    res.end(JSON.stringify(result.map(r=>({rows:r.rows,affectedRows:r.affectedRows ?? r.rowCount}))));
  }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e.message}));}
});
server.listen(54329,'127.0.0.1',()=>console.log('Private PostgreSQL bridge ready at 127.0.0.1:54329'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await db.close?.();await db.end?.();process.exit(0);}));
