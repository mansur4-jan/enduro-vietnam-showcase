import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {AdminCatalog} from '@/components/admin/AdminCatalog';
export const dynamic='force-dynamic';
export default async function Page(){const u=await currentUser();if(!u)redirect('/admin/login');return <AdminCatalog user={u}/>;}
