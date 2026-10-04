import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {query} from '@/lib/db';
import {Settings} from '@/components/admin/Settings';
export const dynamic='force-dynamic';
export default async function Page(){const u=await currentUser();if(!u)redirect('/admin/login');if(u.role!=='owner')redirect('/admin');const users=await query<{id:string;email:string;role:string;active:boolean}>('SELECT id,email,role,active FROM users ORDER BY created_at');const organizations=await query<{id:string;name:string}>('SELECT id,name FROM organizations');return <Settings users={users} organizations={organizations} mfaEnabled={u.mfa_enabled}/>;}
