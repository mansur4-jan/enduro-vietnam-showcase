import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireUser,checkOrigin,AccessError,can} from '@/lib/auth';
import {query} from '@/lib/db';
export const runtime='nodejs';
async function operator(){const u=await requireUser();if(u.role==='partner')throw new AccessError(403,'Forbidden');return u;}
export async function GET(){try{const u=await operator();const leads=await query('SELECT id,locale,status,assigned_to,contact,request,snapshot,created_at FROM leads ORDER BY created_at DESC LIMIT 200',[],u.id);const notifications=await query('SELECT lead_id,channel,status,attempts,last_error FROM outbox WHERE lead_id=ANY($1)',[leads.map(l=>l.id)]);const assignees=can(u,'leads')?await query("SELECT id,email FROM users WHERE active AND role IN ('owner','staff') ORDER BY email"):[];return NextResponse.json({leads,notifications,assignees});}catch(e){return failure(e);}}
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('status'),id:z.string().uuid(),status:z.enum(['new','in_progress','waiting','confirmed','completed','cancelled','spam'])}),
 z.object({action:z.literal('assign'),id:z.string().uuid(),assignedTo:z.string().uuid().nullable()})
]);
export async function POST(req:Request){try{checkOrigin(req);const u=await operator(),raw=await req.json(),b=input.parse({...raw,action:raw.action??'status'});let rows;
 if(b.action==='assign'){if(!can(u,'leads'))throw new AccessError(403,'Forbidden');rows=await query("WITH changed AS (UPDATE leads SET assigned_to=$1 WHERE id=$2 AND ($1::text IS NULL OR EXISTS(SELECT 1 FROM users WHERE id=$1 AND active AND role IN ('owner','staff'))) RETURNING id) INSERT INTO lead_events(id,lead_id,user_id,action) SELECT $3,id,$4,'assigned' FROM changed RETURNING lead_id",[b.assignedTo,b.id,randomUUID(),u.id]);}
 else rows=await query('WITH changed AS (UPDATE leads SET status=$1 WHERE id=$2 RETURNING id) INSERT INTO lead_events(id,lead_id,user_id,action) SELECT $3,id,$4,$5 FROM changed RETURNING lead_id',[b.status,b.id,randomUUID(),u.id,b.status],u.id);
 if(!rows.length)throw new AccessError(404,'Not found or invalid assignee');return NextResponse.json({ok:true});}catch(e){return failure(e);}}
function failure(e:unknown){return NextResponse.json({error:e instanceof AccessError?e.message:e instanceof z.ZodError?'Invalid request':'Operation failed'},{status:e instanceof AccessError?e.status:e instanceof z.ZodError?400:503});}
