import {OfferingDetail} from '@/components/catalog/OfferingDetail';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {query} from '@/lib/db';
import type {Offering} from '@/lib/catalog-types';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const u=await currentUser();if(!u)redirect('/admin/login');const {id}=await params;const [o]=await query<Offering>('SELECT * FROM offerings WHERE id=$1',[id],u.id);if(!o)notFound();return <><Link prefetch={false} href="/admin">← Кабинет</Link><OfferingDetail offering={{...o,published_data:o.working_data}} locale={o.working_data.translations.ru?'ru':'en'} path={o.working_data.routes.ru??o.working_data.routes.en??'/admin'} preview/></>;}
