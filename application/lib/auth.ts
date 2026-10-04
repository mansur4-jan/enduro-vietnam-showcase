import 'server-only';
import {cookies} from 'next/headers';
import {randomBytes,randomUUID,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {TOTP,Secret} from 'otpauth';
import {query,batch} from './db';
import type {User} from './catalog-types';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function passwordValid(password:string,hash:string){const [salt,key]=hash.split(':');if(!salt||!key)return false;const actual=scryptSync(password,salt,64),expected=Buffer.from(key,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export async function currentUser():Promise<User|null>{const token=(await cookies()).get('enduro_session')?.value;if(!token)return null;const users=await query<User>('SELECT u.id,u.email,u.role,u.permissions,u.active,u.mfa_enabled FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active',[digest(token)]);return users[0]??null;}
export function can(user:User,permission:string){return user.role==='owner'||user.role==='staff'&&user.permissions.includes(permission);}
export async function requireUser(permission?:string){const u=await currentUser();if(!u)throw new AccessError(401,'Session expired');if(permission&&!can(u,permission))throw new AccessError(403,'Forbidden');return u;}
export class AccessError extends Error{constructor(public status:number,message:string){super(message);}}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');const expected=new URL(process.env.NODE_ENV==='production'?(process.env.NEXT_PUBLIC_SITE_URL??req.url):req.url).origin;if(!origin||origin!==expected)throw new AccessError(403,'Invalid request origin');}
export async function setSession(userId:string){const token=randomBytes(32).toString('hex');await query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[digest(token),userId]);(await cookies()).set('enduro_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production'&&process.env.APP_HTTPS==='1',sameSite:'strict',path:'/',maxAge:43200});}
export async function logout(){const store=await cookies();const t=store.get('enduro_session')?.value;if(t)await query('DELETE FROM sessions WHERE token_hash=$1',[digest(t)]);store.delete('enduro_session');}
export async function limit(key:string,max:number,seconds:number){const r=await query<{count:number}>('INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+$2::int*interval \'1 second\') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+$2::int*interval \'1 second\' ELSE rate_limits.reset_at END RETURNING count',[digest(key),seconds]);if(r[0].count>max)throw new AccessError(429,'Too many requests. Try later.');}
export function totp(secret:string){return new TOTP({issuer:'Enduro Vietnam',label:'Owner',algorithm:'SHA1',digits:6,period:30,secret:Secret.fromBase32(secret)});}
export function verifyOTP(secret:string,token:string){return /^\d{6}$/.test(token)&&totp(secret).validate({token,window:1})!==null;}
export async function audit(userId:string,action:string,entity:string,entityId:string,detail:unknown={}){await batch([{sql:'INSERT INTO audit_log(id,user_id,action,entity,entity_id,detail) VALUES($1,$2,$3,$4,$5,$6::jsonb)',params:[randomUUID(),userId,action,entity,entityId,JSON.stringify(detail)]}],userId);}
