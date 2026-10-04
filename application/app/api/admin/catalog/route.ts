import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,batch} from '@/lib/db';
import {AccessError,requireUser,checkOrigin,can,audit} from '@/lib/auth';
import {offeringDataSchema} from '@/lib/offering-validation';
import type {Offering} from '@/lib/catalog-types';
export const runtime='nodejs';
export async function GET(req:Request){try{const u=await requireUser();const id=new URL(req.url).searchParams.get('id');if(id){const [o]=await query<Offering>('SELECT * FROM offerings WHERE id=$1',[id],u.id);if(!o)throw new AccessError(404,'Not found');const revisions=await query('SELECT id,version,author_id,state,data,note,created_at FROM revisions WHERE offering_id=$1 ORDER BY version DESC',[id],u.id);return NextResponse.json({offering:o,revisions});}const offerings=await query('SELECT id,type,status,version,working_data,updated_at FROM offerings ORDER BY updated_at DESC',[],u.id);const categories=await query('SELECT * FROM categories ORDER BY sort_order',[],u.id);const destinations=await query('SELECT * FROM destinations',[],u.id);const organizations=await query('SELECT * FROM organizations',[],u.id);return NextResponse.json({offerings,categories,destinations,organizations});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const u=await requireUser();const b=await req.json();const action=z.enum(['create','save','review','publish','correction','suspend','archive','restore','category']).parse(b.action);
 if(action==='category'){if(!can(u,'catalog'))throw new AccessError(403,'Forbidden');const c=z.object({slug:z.string().regex(/^[a-z0-9-]+$/),names:z.object({ru:z.string().min(2).max(100),en:z.string().min(2).max(100)}),sortOrder:z.number().int().default(0),icon:z.string().max(30).optional(),parentId:z.string().nullable().optional()}).parse(b);const id=randomUUID();await query('INSERT INTO categories(id,names,slug,sort_order,icon,parent_id) VALUES($1,$2::jsonb,$3,$4,$5,$6)',[id,JSON.stringify(c.names),c.slug,c.sortOrder,c.icon??null,c.parentId??null],u.id);await audit(u.id,'create','category',id);return NextResponse.json({id});}
 if(action==='create'){
  const c=z.object({type:z.enum(['tour','activity','rental']),organizationId:z.string(),categoryId:z.string(),destinationId:z.string(),slug:z.string().regex(/^[a-z0-9-]+$/),data:offeringDataSchema}).parse(b);const id=randomUUID();
  await batch([{sql:"INSERT INTO offerings(id,organization_id,type,category_id,destination_id,slug,status,working_data,editor_modified) VALUES($1,$2,$3,$4,$5,$6,'draft',$7::jsonb,true)",params:[id,c.organizationId,c.type,c.categoryId,c.destinationId,c.slug,JSON.stringify(c.data)]},{sql:"INSERT INTO revisions(id,offering_id,version,author_id,state,data) VALUES($1,$2,1,$3,'draft',$4::jsonb)",params:[randomUUID(),id,u.id,JSON.stringify(c.data)]}],u.id);await audit(u.id,'create','offering',id);return NextResponse.json({id});
 }
 const id=z.string().parse(b.id);const [o]=await query<Offering>('SELECT * FROM offerings WHERE id=$1',[id],u.id);if(!o)throw new AccessError(404,'Not found');const version=z.number().int().parse(b.version);if(o.version!==version)throw new AccessError(409,'Another editor changed this offering. Reload and compare.');
 let data=structuredClone(o.working_data),state=o.status;const note=z.string().max(2000).optional().parse(b.note)??null;
 if(action==='save'){data=offeringDataSchema.parse(b.data);state=o.published_data?'draft':o.status==='review'?'draft':o.status;}
 if(action==='restore'){const [r]=await query<{data:Offering['working_data']}>('SELECT data FROM revisions WHERE offering_id=$1 AND version=$2',[id,z.number().int().parse(b.revisionVersion)],u.id);if(!r)throw new AccessError(404,'Revision not found');data=r.data;state='draft';}
 if(action==='review')state='review';
 if(['publish','correction','suspend','archive'].includes(action)&&!can(u,'publish'))throw new AccessError(403,'Publishing permission required');
 if(action==='publish'){
  offeringDataSchema.parse(data);
  const categoryIds=[...new Set(data.categoryIds??[])];if(categoryIds.length){const valid=await query('SELECT id FROM categories WHERE id=ANY($1)',[categoryIds]);if(valid.length!==categoryIds.length)throw new AccessError(400,'Unknown category');}
  if(data.endDestinationId&&!(await query('SELECT id FROM destinations WHERE id=$1',[data.endDestinationId])).length)throw new AccessError(400,'Unknown end destination');
  for(const lang of ['ru','en'] as const){if(!data.translations[lang])continue;const path=data.routes[lang];if(!path||lang==='ru'&&!path.startsWith('/ru/')||lang==='en'&&path.startsWith('/ru/'))throw new AccessError(400,'Each translation needs its own matching language URL');if(/^\/(?:ru\/)?(?:admin|api|assets|media|_next|style-guide|site-map)(?:\/|$)/.test(path))throw new AccessError(400,'Reserved URL');const [existing]=await query<{offering_id:string|null}>('SELECT offering_id FROM url_registry WHERE path=$1',[path]);if(existing&&existing.offering_id!==id)throw new AccessError(409,'This URL belongs to another page');}
  state='published';
 }
 if(action==='correction')state='correction';if(action==='suspend')state='suspended';if(action==='archive')state='archive';
 const [organization]=await query<{name:string}>('SELECT name FROM organizations WHERE id=$1',[o.organization_id]);data.supplier=organization.name;
 const statements=[{sql:'UPDATE offerings SET working_data=$1::jsonb,status=$2,version=version+1,editor_modified=true,updated_at=now(),published_data=CASE WHEN $3 THEN $1::jsonb WHEN $4 THEN NULL ELSE published_data END,published_at=CASE WHEN $3 THEN now() ELSE published_at END WHERE id=$5 AND version=$6 RETURNING id',params:[JSON.stringify(data),state,action==='publish',['suspend','archive'].includes(action),id,version]},{sql:'INSERT INTO revisions(id,offering_id,version,author_id,state,data,note) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',params:[randomUUID(),id,version+1,u.id,state,JSON.stringify(data),note]}];
 // Routes are promoted only with the approved snapshot; preserve every previous path as an exact redirect.
 if(action==='publish')for(const [locale,path]of Object.entries(data.routes)){
  statements.push({sql:"UPDATE url_registry SET kind='redirect',target=$1 WHERE offering_id=$2 AND locale=$3 AND path<>$1",params:[path,id,locale]} as typeof statements[number]);
  statements.push({sql:'INSERT INTO url_registry(path,locale,kind,offering_id,source_status) VALUES($1,$2,\'offering\',$3,200) ON CONFLICT(path) DO UPDATE SET kind=\'offering\',target=NULL,offering_id=excluded.offering_id RETURNING path',params:[path,locale,id]} as typeof statements[number]);
 }
 const result=await batch(statements,u.id);if(!result[0].rows.length)throw new AccessError(409,'Version conflict');
 await audit(u.id,action,'offering',id,{version:version+1});return NextResponse.json({ok:true,version:version+1});
 }catch(e){return fail(e);}}
function fail(e:unknown){return NextResponse.json({error:e instanceof AccessError?e.message:e instanceof z.ZodError?'Check offering fields':'Operation failed'}, {status:e instanceof AccessError?e.status:e instanceof z.ZodError?400:503});}
