import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
const base=process.env.APP_URL??'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local tests only');
const checks=[];function check(name,ok){checks.push({name,passed:!!ok});if(!ok)throw new Error(name);}
async function request(path,body,cookie,key){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{origin:base,'content-type':'application/json',...(cookie?{cookie}:{}),...(key?{'idempotency-key':key}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});let d;try{d=await r.json();}catch{d=null;}return {r,d};}
const privateKey=(await readFile('.data/bridge-key','utf8')).trim();async function sql(statements,userId){const r=await fetch('http://127.0.0.1:54329/query',{method:'POST',headers:{authorization:privateKey,'content-type':'application/json'},body:JSON.stringify({statements,userId})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
const credentials=await readFile('.data/owner-access.txt','utf8');const email=/Email: (.+)/.exec(credentials)[1],password=/Password: (.+)/.exec(credentials)[1];
const key=randomUUID();let leadId;const operatorId=randomUUID(),operatorToken=randomUUID();
try{
 check('Unauthenticated catalog API rejected',(await request('/api/admin/catalog')).r.status===401);
 const login=await request('/api/admin/auth',{action:'login',email,password});check('Owner can login',login.r.status===200);const cookie=login.r.headers.get('set-cookie').split(';')[0];check('Session is HttpOnly',login.r.headers.get('set-cookie').includes('HttpOnly'));
 check('Cross-origin mutation rejected',(await fetch(base+'/api/admin/auth',{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json',cookie},body:JSON.stringify({action:'logout'})})).status===403);
 const catalog=await request('/api/admin/catalog',null,cookie);check('Owner sees full imported catalog',catalog.d.offerings.length===JSON.parse(await readFile('data/catalog-seed.json','utf8')).offerings.length);
 const selected=catalog.d.offerings.find(o=>o.type==='tour'),detail=await request('/api/admin/catalog?id='+selected.id,null,cookie);const version=detail.d.offering.version;
 check('Stale edit version rejected',(await request('/api/admin/catalog',{action:'save',id:selected.id,version:version-1,data:detail.d.offering.working_data},cookie)).r.status===409);
 const offer=(await sql([{sql:"SELECT id,published_data FROM offerings WHERE source_id IS NOT NULL AND type='tour' LIMIT 1"}]))[0].rows[0];const lead={offeringId:offer.id,locale:'en',name:'Local acceptance fixture',contact:'fixture@example.test',date:'2027-01-15',participants:2,comment:'Local test, do not send',website:'',consent:'on',sourcePath:offer.published_data.routes.en??offer.published_data.routes.ru,utm:{utm_source:'acceptance',email:'must not store'}};
 const first=await request('/api/leads',lead,null,key);check('Lead saved before success',first.r.status===201&&first.d.saved);leadId=first.d.id;
 const second=await request('/api/leads',lead,null,key);check('Network retry returns same lead',second.d.id===leadId);
 const changed=await request('/api/leads',{...lead,name:'Different payload'},null,key);check('Idempotency key payload conflict rejected',changed.r.status===409);
 const db=(await sql([{sql:'SELECT snapshot,utm FROM leads WHERE id=$1',params:[leadId]},{sql:'SELECT channel,status FROM outbox WHERE lead_id=$1',params:[leadId]}]));check('Both durable channel jobs exist',db[1].rows.length===2);const [events]=await sql([{sql:"SELECT count(*)::int AS n FROM lead_events WHERE lead_id=$1 AND action='lead_saved'",params:[leadId]}]);check('One saved event despite network retry',events.rows[0].n===1);check('Server snapshot price retained',db[0].rows[0].snapshot.commerce.amountMinor===offer.published_data.commerce.amountMinor);check('Unexpected UTM fields excluded',!db[0].rows[0].utm.email);
 check('Lead visible to owner',(await request('/api/admin/leads',null,cookie)).d.leads.some(l=>l.id===leadId));
 await sql([{sql:"INSERT INTO users(id,email,password_hash,role) VALUES($1,$1||'@fixture.test','not-a-password','staff')",params:[operatorId]},{sql:"INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",params:[createHash('sha256').update(operatorToken).digest('hex'),operatorId]}]);
 const operatorCookie='enduro_session='+operatorToken;
 check('Staff cannot see unassigned lead',!(await request('/api/admin/leads',null,operatorCookie)).d.leads.some(l=>l.id===leadId));
 check('Owner assigns lead',(await request('/api/admin/leads',{action:'assign',id:leadId,assignedTo:operatorId},cookie)).r.status===200);
 const assigned=await request('/api/admin/leads',null,operatorCookie);check('Assigned staff sees only own lead',assigned.r.status===200&&assigned.d.leads.length===1&&assigned.d.leads[0].id===leadId);
 check('Assigned staff cannot list other operators',assigned.d.assignees.length===0);
 check('Assigned staff changes status',(await request('/api/admin/leads',{id:leadId,status:'in_progress'},operatorCookie)).r.status===200);
 check('Assigned staff cannot reassign',(await request('/api/admin/leads',{action:'assign',id:leadId,assignedTo:null},operatorCookie)).r.status===403);
 check('Owner unassigns lead',(await request('/api/admin/leads',{action:'assign',id:leadId,assignedTo:null},cookie)).r.status===200);
 check('Removed assignment revokes lead access',(await request('/api/admin/leads',{id:leadId,status:'spam'},operatorCookie)).r.status===404);
 const {processOutbox}=await import('../server/outbox.mjs');const disabled=await processOutbox(sql,{DELIVERY_ENABLED:'0'});check('Unconfigured providers block delivery without losing lead',disabled.blocked>=2);
 await sql([{sql:"UPDATE outbox SET status='pending',available_at=now() WHERE lead_id=$1",params:[leadId]}]);const fake={DELIVERY_ENABLED:'1',RESEND_API_KEY:'private-test-key',OWNER_EMAIL:'fixture@example.test',EMAIL_FROM:'fixture@example.test',TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_CHAT_ID:'123'};
 const failed=await processOutbox(sql,fake,async()=>{throw new Error('Simulated provider outage');});check('Provider outage queues durable retry',failed.retry===2);
 await sql([{sql:'UPDATE outbox SET available_at=now() WHERE lead_id=$1',params:[leadId]}]);const delivered=await processOutbox(sql,fake,async()=>new Response(JSON.stringify({id:'simulated-email',ok:true,result:{message_id:1}}),{status:200,headers:{'content-type':'application/json'}}));check('Mock provider retry succeeds',delivered.sent===2);
 check('Mock success deduplicated on next cycle',(await processOutbox(sql,fake,async()=>{throw new Error('Must not call');})).claimed===0);
 await request('/api/admin/auth',{action:'logout'},cookie);check('Logout invalidates session',(await request('/api/admin/catalog',null,cookie)).r.status===401);
}finally{if(leadId)await sql([{sql:'DELETE FROM outbox WHERE lead_id=$1',params:[leadId]},{sql:'DELETE FROM lead_events WHERE lead_id=$1',params:[leadId]},{sql:'DELETE FROM leads WHERE id=$1',params:[leadId]}]);await sql([{sql:'DELETE FROM sessions WHERE user_id=$1',params:[operatorId]},{sql:'DELETE FROM users WHERE id=$1',params:[operatorId]}]);await writeFile('.shipstudio/application-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),realDeliveryTested:false,checks},null,2)+'\n');}
console.log(`${checks.length} HTTP / durable queue checks passed; no real messages sent; fixture removed`);
