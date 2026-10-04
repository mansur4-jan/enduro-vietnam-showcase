import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const runtime='nodejs';
export async function GET(){try{await query('SELECT 1');return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});}catch{return NextResponse.json({ok:false},{status:503,headers:{'cache-control':'no-store'}});}}
