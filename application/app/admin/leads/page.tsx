import {redirect} from 'next/navigation';
import {currentUser,can} from '@/lib/auth';
import {Leads} from '@/components/admin/Leads';
export const dynamic='force-dynamic';
export default async function Page(){const u=await currentUser();if(!u)redirect('/admin/login');if(u.role!=='staff'&&!can(u,'leads'))redirect('/admin');return <Leads/>;}
