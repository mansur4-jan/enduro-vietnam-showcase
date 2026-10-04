import {AuthForm} from '@/components/admin/AuthForm';
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){return <AuthForm mode="accept" token={(await searchParams).token}/>;}
