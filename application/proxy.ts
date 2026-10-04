import {NextRequest,NextResponse} from 'next/server';
export function proxy(request:NextRequest){const headers=new Headers(request.headers);headers.set('x-enduro-locale',request.nextUrl.pathname.startsWith('/admin')||request.nextUrl.pathname==='/ru'||request.nextUrl.pathname.startsWith('/ru/')?'ru':'en');
 const username=process.env.STAGING_USER,password=process.env.STAGING_PASSWORD;
 if(Boolean(username)!==Boolean(password))return new NextResponse('Staging access is not fully configured',{status:503,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 if(username&&password){const expected=`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;if(request.headers.get('authorization')!==expected)return new NextResponse('Staging access required',{status:401,headers:{'WWW-Authenticate':'Basic realm="Private staging"','X-Robots-Tag':'noindex, nofollow'}});}
 const response=NextResponse.next({request:{headers}});if(username||process.env.NEXT_PUBLIC_LOCAL_SAFE_MODE==='1')response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
