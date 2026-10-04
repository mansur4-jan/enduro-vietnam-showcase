import {NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import {query} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{file:string}>}){const {file}=await params;if(!/^[a-f0-9-]{36}\.webp$/.test(file))return new NextResponse(null,{status:404});const path=`/media/${file}`;try{const published=await query("SELECT id FROM offerings WHERE id NOT LIKE 'fixture-%' AND published_data IS NOT NULL AND published_data->'photos' @> $1::jsonb",[JSON.stringify([{src:path}])]);if(!published.length){const u=await currentUser();if(!u)return new NextResponse(null,{status:404});const rows=await query('SELECT id FROM media WHERE path=$1',[path],u.id);if(!rows.length)return new NextResponse(null,{status:404});}const bytes=await readFile(`.data/media/${file}`);return new NextResponse(bytes,{headers:{'content-type':'image/webp','cache-control':published.length?'public, max-age=3600':'private, no-store','x-content-type-options':'nosniff'}});}catch{return new NextResponse(null,{status:404});}}
