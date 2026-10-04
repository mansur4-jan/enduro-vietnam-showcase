export async function processOutbox(sql,config=process.env,send=fetch){
 const [result]=await sql([{sql:"WITH ready AS (SELECT id FROM outbox WHERE (status IN ('pending','retry','blocked') AND available_at<=now()) OR (status='processing' AND lease_until<now()) ORDER BY available_at LIMIT 20 FOR UPDATE SKIP LOCKED) UPDATE outbox o SET status='processing',lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now() FROM ready WHERE o.id=ready.id RETURNING o.*"}]);
 const report={claimed:result.rows.length,sent:0,retry:0,blocked:0};
 for(const job of result.rows){
  const [leads]=await sql([{sql:'SELECT id,offering_id,locale,source_path,contact,request,snapshot FROM leads WHERE id=$1',params:[job.lead_id]}]);const l=leads.rows[0];
  const configured=config.DELIVERY_ENABLED==='1'&&(job.channel==='email'?config.RESEND_API_KEY&&config.OWNER_EMAIL&&config.EMAIL_FROM:config.TELEGRAM_BOT_TOKEN&&/^-?\d+$/.test(config.TELEGRAM_CHAT_ID??''));
  if(!configured){await sql([{sql:"UPDATE outbox SET status='blocked',lease_until=NULL,available_at=now()+interval '5 minutes',last_error='Delivery not configured or disabled',updated_at=now() WHERE id=$1",params:[job.id]}]);report.blocked++;continue;}
  try {
   const text=`Request ${l.id}\n${l.snapshot.title}\n${l.contact.name}: ${l.contact.contact}\nRequested date: ${l.request.date}\nRental end: ${l.request.endDate??'-'}\nParticipants: ${l.request.participants??'-'}\nOffer: ${l.offering_id}\nLanguage: ${l.locale}\nOption: ${l.snapshot.variant?.id??'confirm later'}\nSource: ${l.source_path}\nDates and terms need manual confirmation.`;
   let response;
   if(job.channel==='email')response=await send('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${config.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from:config.EMAIL_FROM,to:[config.OWNER_EMAIL],subject:`Enduro Vietnam request ${l.id}`,text}),signal:AbortSignal.timeout(15000)});
   else response=await send(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:config.TELEGRAM_CHAT_ID,text,disable_web_page_preview:true}),signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(!response.ok||job.channel==='email'&&typeof data.id!=='string'||job.channel==='telegram'&&(!data.ok||typeof data.result?.message_id!=='number'))throw new Error(`Provider rejected request (${response.status})`);
   await sql([{sql:"UPDATE outbox SET status='sent',lease_until=NULL,provider_id=$1,last_error=NULL,updated_at=now() WHERE id=$2",params:[String(data.id??data.result.message_id),job.id]}]);report.sent++;
  }catch{const delay=Math.min(3600,30*2**Math.min(job.attempts,7));await sql([{sql:"UPDATE outbox SET status='retry',lease_until=NULL,available_at=now()+$1::int*interval '1 second',last_error='Provider delivery failed; retry scheduled',updated_at=now() WHERE id=$2",params:[delay,job.id]}]);report.retry++;}
 }
 return report;
}
