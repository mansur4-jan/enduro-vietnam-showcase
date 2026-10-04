import {NextResponse} from 'next/server';
import {randomBytes,randomUUID} from 'node:crypto';
import {Secret} from 'otpauth';
import {z} from 'zod';
import {query,batch} from '@/lib/db';
import {AccessError,checkOrigin,digest,passwordHash,passwordValid,setSession,logout,requireUser,verifyOTP,totp,limit,audit} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 try{
  checkOrigin(req);const b=await req.json();
  const action=z.enum(['login','logout','accept','invite','recovery','reset','mfa-start','mfa-confirm','revoke','permissions','organization']).parse(b.action);
  if(action==='logout'){await logout();return NextResponse.json({ok:true});}
  if(action==='login'){
   const input=z.object({email:z.string().email().max(254),password:z.string().min(1).max(256),otp:z.string().optional()}).parse(b);
   await limit(`login:${input.email.toLowerCase()}`,8,900);
   const [u]=await query<{id:string;password_hash:string;active:boolean;mfa_enabled:boolean;mfa_secret:string}>('SELECT id,password_hash,active,mfa_enabled,mfa_secret FROM users WHERE email=$1',[input.email.toLowerCase()]);
   if(!u||!u.active||!passwordValid(input.password,u.password_hash)||u.mfa_enabled&&!verifyOTP(u.mfa_secret,input.otp??''))throw new AccessError(401,'Invalid credentials or authentication code');
   await setSession(u.id);return NextResponse.json({ok:true});
  }
  if(action==='accept'||action==='reset'){
   const input=z.object({token:z.string().min(32).max(128),password:z.string().min(12).max(128)}).parse(b);
   await limit(`token:${digest(input.token)}`,5,900);
   if(action==='accept'){
    const result=await batch<{id:string}>([{sql:"WITH invitation AS (UPDATE invitations SET used_at=now() WHERE token_hash=$1 AND expires_at>now() AND used_at IS NULL RETURNING *) INSERT INTO users(id,email,password_hash,role,permissions) SELECT $2,email,$3,role,permissions FROM invitation RETURNING id",params:[digest(input.token),randomUUID(),passwordHash(input.password)]},{sql:'INSERT INTO memberships(user_id,organization_id) SELECT u.id,i.organization_id FROM invitations i JOIN users u ON u.email=i.email WHERE i.token_hash=$1 AND i.organization_id IS NOT NULL ON CONFLICT DO NOTHING',params:[digest(input.token)]}]);
    if(!result[0].rows.length)throw new AccessError(400,'Invitation expired or already used');
   }else{
    const r=await batch<{id:string}>([{sql:'WITH valid AS (UPDATE recovery_tokens SET used_at=now() WHERE token_hash=$1 AND expires_at>now() AND used_at IS NULL RETURNING user_id), revoked AS (DELETE FROM sessions WHERE user_id IN(SELECT user_id FROM valid)) UPDATE users SET password_hash=$2 WHERE id IN (SELECT user_id FROM valid) RETURNING id',params:[digest(input.token),passwordHash(input.password)]}]);if(!r[0].rows.length)throw new AccessError(400,'Recovery link expired');
   }
   return NextResponse.json({ok:true});
  }
  const u=await requireUser();
  if(action==='mfa-start'){
   if(u.role!=='owner')throw new AccessError(403,'Owner only');if(u.mfa_enabled)throw new AccessError(400,'MFA already enabled');const secret=new Secret({size:20}).base32;await query('UPDATE users SET mfa_secret=$1 WHERE id=$2 AND NOT mfa_enabled',[secret,u.id]);const [stored]=await query<{mfa_secret:string}>('SELECT mfa_secret FROM users WHERE id=$1',[u.id]);return NextResponse.json({secret:stored.mfa_secret,uri:totp(stored.mfa_secret).toString()});
  }
  if(action==='mfa-confirm'){const [s]=await query<{mfa_secret:string}>('SELECT mfa_secret FROM users WHERE id=$1',[u.id]);if(u.role!=='owner'||!s.mfa_secret||!verifyOTP(s.mfa_secret,z.string().parse(b.otp)))throw new AccessError(400,'Invalid code');await query('UPDATE users SET mfa_enabled=true WHERE id=$1',[u.id]);await audit(u.id,'mfa_enabled','user',u.id);return NextResponse.json({ok:true});}
  if(u.role!=='owner')throw new AccessError(403,'Owner only');
  if(action==='organization'){const input=z.object({name:z.string().min(2).max(100),slug:z.string().regex(/^[a-z0-9-]+$/)}).parse(b);const id=randomUUID();await query('INSERT INTO organizations(id,name,slug) VALUES($1,$2,$3)',[id,input.name,input.slug]);await audit(u.id,'create','organization',id);return NextResponse.json({id});}
  if(action==='invite'){
   const input=z.object({email:z.string().email(),role:z.enum(['staff','partner']),organizationId:z.string().nullable().optional(),permissions:z.array(z.enum(['catalog','publish','leads','urls'])).default([])}).parse(b);
   if(input.role==='partner'&&!input.organizationId)throw new AccessError(400,'Partner organization required');const token=randomBytes(32).toString('hex');await query("INSERT INTO invitations(token_hash,email,role,organization_id,permissions,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '48 hours')",[digest(token),input.email.toLowerCase(),input.role,input.organizationId??null,input.role==='staff'?input.permissions:[]]);await audit(u.id,'invite','user',input.email);return NextResponse.json({url:`/admin/invite?token=${token}`,delivery:'manual_private_link'});
  }
  const target=z.string().parse(b.userId);if(target===u.id)throw new AccessError(400,'Cannot revoke own owner access');
  if(action==='recovery'){const token=randomBytes(32).toString('hex');await query("INSERT INTO recovery_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[digest(token),target]);await audit(u.id,'recovery_issued','user',target);return NextResponse.json({url:`/admin/recover?token=${token}`});}
  if(action==='revoke'){await batch([{sql:"UPDATE users SET active=false WHERE id=$1 AND role<>'owner'",params:[target]},{sql:'DELETE FROM sessions WHERE user_id=$1',params:[target]}]);await audit(u.id,'revoke','user',target);return NextResponse.json({ok:true});}
  if(action==='permissions'){const perms=z.array(z.enum(['catalog','publish','leads','urls'])).parse(b.permissions);await query("UPDATE users SET permissions=$1 WHERE id=$2 AND role='staff'",[perms,target]);await audit(u.id,'permissions','user',target,{permissions:perms});return NextResponse.json({ok:true});}
  throw new AccessError(400,'Unsupported action');
 }catch(e){return NextResponse.json({error:e instanceof AccessError?e.message:e instanceof z.ZodError?'Check the fields':'Operation failed'}, {status:e instanceof AccessError?e.status:e instanceof z.ZodError?400:503});}
}
