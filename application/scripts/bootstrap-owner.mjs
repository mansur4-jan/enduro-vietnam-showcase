import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,randomUUID,scryptSync} from 'node:crypto';
import {runSQL as sql} from '../server/sql-client.mjs';
const owners=(await sql([{sql:"SELECT id FROM users WHERE role='owner'"}]))[0].rows;
if(owners.length){console.log('Owner already exists; no credentials changed');process.exit(0);}
if(process.env.NODE_ENV==='production'&&!process.env.OWNER_EMAIL)throw new Error('OWNER_EMAIL required in production');
const email=process.env.OWNER_EMAIL??'owner@localhost.test',password=process.env.OWNER_PASSWORD??randomBytes(24).toString('base64url');
if(password.length<12)throw new Error('Password must contain at least 12 characters');
const salt=randomBytes(16).toString('hex'),hash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
await sql([{sql:"INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'owner')",params:[randomUUID(),email,hash]}]);
await mkdir('.data',{recursive:true,mode:0o700});await writeFile('.data/owner-access.txt',`Local owner account\nEmail: ${email}\nPassword: ${password}\nEnable MFA in /admin/settings. Keep this file private.\n`,{mode:0o600});console.log('Owner created. Credentials saved privately in .data/owner-access.txt (not printed).');
