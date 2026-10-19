import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import nodemailer from 'nodemailer';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url)),override:true});
const user=(process.env.SMTP_USER||'').trim();
const pass=(process.env.SMTP_APP_PASSWORD||'').replace(/\s/g,'');
const owner=(process.env.STORE_OWNER_EMAIL||'').trim();
if(!user||!pass||!owner||/^(REPLACE|PASTE|YOUR_|<)/i.test(pass)){console.error('Missing SMTP_USER, SMTP_APP_PASSWORD or STORE_OWNER_EMAIL in server/.env');process.exit(1)}
try{
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:12000});
 await transport.verify();
 console.log(`✅ Gmail SMTP authentication successful for ${user}. Owner alerts: ${owner}.`);
 console.log('This checks SMTP login; it does not send an email. Use Admin → Email alerts → Send test email for a delivery test.');
}catch(e){console.error('Gmail SMTP check failed:',e.message);process.exitCode=1}
