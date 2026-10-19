import nodemailer from 'nodemailer';
import {randomUUID} from 'node:crypto';
import MailJob from '../models/MailJob.js';

const BRAND = 'NORTHLINE Studio';
const OWNER_EMAIL = () => (process.env.STORE_OWNER_EMAIL || '').trim().toLowerCase();
const USER = () => (process.env.SMTP_USER || '').trim();
const PASSWORD = () => {const value=(process.env.SMTP_APP_PASSWORD || '').replace(/\s/g, '');return /^(REPLACE|PASTE|YOUR_|<)/i.test(value)?'':value};
export const emailConfigured = () => Boolean(USER() && PASSWORD() && OWNER_EMAIL());
export const emailInfo = () => ({configured: emailConfigured(), sender: USER() || null, owner: OWNER_EMAIL() || null});
const money = n => '$' + Number(n || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publicUrl = () => (process.env.STORE_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
const number = order => order._id.toString().slice(-8).toUpperCase();
const rows = items => items.map(i => `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e4dd">${esc(i.name)}${i.finish ? `<br><small style="color:#667369">${esc(i.finish)}</small>` : ''} × ${Number(i.quantity)}</td><td style="padding:12px 0;text-align:right;border-bottom:1px solid #e5e4dd">${money(i.price * i.quantity)}</td></tr>`).join('');
function frame(title, intro, content, footer = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f2ee;color:#243129;font-family:Arial,Helvetica,sans-serif"><div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #e9e8df"><div style="padding:25px 34px;background:#24382e;color:white"><span style="font-size:23px;letter-spacing:-1px;font-weight:800">NORTHLINE<span style="color:#d4ae78">.</span></span><span style="float:right;font-size:11px;letter-spacing:2px;padding-top:9px">STUDIO</span></div><div style="padding:32px 34px"><p style="font-size:11px;letter-spacing:2px;color:#728276;text-transform:uppercase;font-weight:700">NORTHLINE / NOTIFICATIONS</p><h1 style="font-size:30px;line-height:1.18;letter-spacing:-1px;margin:12px 0 18px">${esc(title)}</h1><p style="line-height:1.65;color:#59665c">${esc(intro)}</p>${content}${footer ? `<p style="line-height:1.6;margin-top:27px">${footer}</p>` : ''}</div><div style="padding:20px 34px;background:#eff0ea;font-size:12px;line-height:1.6;color:#556359">${BRAND} · Automated transactional notification<br>This message relates to shopping activity at NORTHLINE.</div></div></body></html>`;
}
const details = order => `<table style="width:100%;border-collapse:collapse;margin-top:24px"><thead><tr><th style="text-align:left;padding-bottom:12px;border-bottom:2px solid #24382e">ITEM</th><th style="text-align:right;padding-bottom:12px;border-bottom:2px solid #24382e">AMOUNT</th></tr></thead><tbody>${rows(order.items)}<tr><td style="padding:15px 0">Subtotal</td><td style="text-align:right">${money(order.subtotal)}</td></tr><tr><td style="padding:7px 0">Delivery</td><td style="text-align:right">${order.shippingCost ? money(order.shippingCost) : 'FREE'}</td></tr><tr><td style="padding:15px 0;border-top:2px solid #24382e;font-weight:700">TOTAL</td><td style="text-align:right;border-top:2px solid #24382e;font-weight:700">${money(order.total)}</td></tr></tbody></table>`;
const address = s => [s.fullName, s.address, `${s.city}, ${s.postalCode}`, s.country].filter(Boolean).join(', ');
let transporter;
function mailer() {
  if (!emailConfigured()) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host:'smtp.gmail.com', port:465, secure:true,
    auth:{user:USER(), pass:PASSWORD()},
    connectionTimeout:12000, greetingTimeout:12000, socketTimeout:18000,
    tls:{minVersion:'TLSv1.2'}
  });
  return transporter;
}
export async function queueMail({dedupeKey, kind, to, subject, html, text, expiresAt}) {
  const query = {dedupeKey};
  try {
    await MailJob.updateOne(query, {$setOnInsert:{dedupeKey,kind,to,subject,html,text,...(expiresAt?{expiresAt}:{})}}, {upsert:true});
    requestDelivery();
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}
export async function queueOrderEmails(order, user) {
  const orderNo = number(order);
  const owner = OWNER_EMAIL();
  const common = `Order #${orderNo}\n${order.items.map(i=>`${i.name} (${i.finish||'Standard'}) × ${i.quantity} - ${money(i.price*i.quantity)}`).join('\n')}\nSubtotal: ${money(order.subtotal)}\nShipping: ${money(order.shippingCost)}\nTOTAL: ${money(order.total)}\nPayment: Cash on delivery`;
  const customerSubject = `NORTHLINE | Your order #${orderNo} is confirmed`;
  const customer = {
    dedupeKey:`order:${order._id}:customer`,kind:'order_customer',to:order.shipping.email,
    subject:customerSubject,
    text:`Hello ${order.shipping.fullName},\n\nThanks for purchasing with us! Your NORTHLINE order has been confirmed. We are preparing your items with care.\n\n${common}\nDelivery to: ${address(order.shipping)}\n\nYou can see your order history: ${publicUrl()}/account\n\nNORTHLINE Studio`,
    html:frame(`Thanks for purchasing with us!`,`Hello ${order.shipping.fullName}, your NORTHLINE order #${orderNo} is confirmed. We are so glad you chose us.`,`${details(order)}<p style="padding:15px;background:#eff0ea;line-height:1.6"><b>Delivery address</b><br>${esc(address(order.shipping))}<br><b>Payment</b> · Cash on delivery (demo store)</p>`,`Your order is being prepared. View your order history in <a style="color:#24382e" href="${esc(publicUrl()+'/account')}">your account</a>.`)
  };
  const jobs=[customer];
  if(owner){
    jobs.push({
      dedupeKey:`order:${order._id}:owner`,kind:'order_owner',to:owner,
      subject:`New NORTHLINE order #${orderNo} · ${money(order.total)}`,
      text:`New order placed!\nCustomer account: ${user?.name||'Customer'} (${user?.email||'Unavailable'})\nOrder contact: ${order.shipping.email}\n\n${common}\nDeliver to: ${address(order.shipping)}\n\nAdmin dashboard: ${publicUrl()}/admin`,
      html:frame(`You have a new order.`, `Order #${orderNo} was placed on NORTHLINE.`, `<div style="padding:16px;background:#eff0ea;line-height:1.65"><b>Customer:</b> ${esc(user?.name||order.shipping.fullName)}<br><b>Account email:</b> ${esc(user?.email||'Unavailable')}<br><b>Order email:</b> ${esc(order.shipping.email)}<br><b>Delivery:</b> ${esc(address(order.shipping))}</div>${details(order)}`,`<a href="${esc(publicUrl()+'/admin')}" style="color:#24382e">Open store dashboard</a>`)
    });
  }
  const outcomes=await Promise.allSettled(jobs.map(queueMail));
  for(const outcome of outcomes)if(outcome.status==='rejected')console.error('[MAIL] Could not queue order email:',outcome.reason.message);
  // Vercel freezes the runtime after a response; flush transactional mail while the request is active.
  if (process.env.VERCEL && emailConfigured()) await processMailQueue(jobs.map(job=>job.dedupeKey),jobs.length);
  const records=await MailJob.find({dedupeKey:{$in:jobs.map(job=>job.dedupeKey)}}).select('dedupeKey status').lean();
  const delivery=new Map(records.map(record=>[record.dedupeKey,record.status]));
  return {queued:outcomes.filter(x=>x.status==='fulfilled').length, total:jobs.length,
    customerQueued:outcomes[0]?.status==='fulfilled', ownerQueued:outcomes[1]?.status==='fulfilled',
    customerDelivery:delivery.get(customer.dedupeKey)||'pending',
    ownerDelivery:jobs[1]?(delivery.get(jobs[1].dedupeKey)||'pending'):null,
    configured:emailConfigured()};
}
export async function queueCartEmail({eventId, product, quantity, finish, user}) {
  if(!OWNER_EMAIL())return false;
  const visitor=user?`${user.name} (${user.email||user.phone||'Verified member'})`:'Guest visitor (email not provided)';
  const total=money(product.price * quantity);
  await queueMail({
    dedupeKey:`cart:${eventId}`,kind:'cart_added',to:OWNER_EMAIL(),
    subject:`NORTHLINE cart activity · ${product.name}`,
    text:`A shopper added a product to their cart.\nShopper: ${visitor}\nProduct: ${product.name}\nQuantity: ${quantity}\nFinish: ${finish||'Standard'}\nValue: ${total}\n\nThis is cart activity, NOT a placed order.`,
    html:frame('Someone added to their bag.',`A visitor has added a NORTHLINE item to their shopping bag. This is not yet an order.`,`<div style="background:#eff0ea;padding:22px;line-height:1.9"><strong>${esc(product.name)}</strong><br><span>Quantity: ${Number(quantity)}</span><br><span>Finish: ${esc(finish||'Standard')}</span><br><span>Cart value: ${esc(total)}</span><br><span>Shopper: ${esc(visitor)}</span></div>`)
  });
  if (process.env.VERCEL && emailConfigured()) await processMailQueue();
  return true;
}
export async function queueTestEmail() {
  if(!emailConfigured())throw new Error('Gmail SMTP is not configured.');
  const eventId=randomUUID();
  await queueMail({
    dedupeKey:`test:${eventId}`,kind:'test',to:OWNER_EMAIL(),
    subject:'NORTHLINE | Email notification test',
    text:'Your NORTHLINE Gmail notifications are connected. You will receive shopping bag and order alerts here.',
    html:frame('Email alerts are connected.','This is a test email from your NORTHLINE server.','<p style="padding:18px;background:#eff0ea">Your order and shopping bag email notifications are ready.</p>')
  });
  if (process.env.VERCEL && emailConfigured()) await processMailQueue();
}
let active=false, timer=null;
export async function processMailQueue(priorityKeys=[],maxJobs=8){
  if(active || !emailConfigured())return;
  active=true;
  try{
    for(let i=0;i<maxJobs;i++){
      const now=new Date();
      const due={$or:[
        {status:'pending',nextAttemptAt:{$lte:now}},
        {status:'retry',nextAttemptAt:{$lte:now}},
        {status:'sending',updatedAt:{$lte:new Date(Date.now()-5*60*1000)}}
      ]};
      const claim=filter=>MailJob.findOneAndUpdate(filter,{$set:{status:'sending',lastError:''},$inc:{attempts:1}},{sort:{createdAt:1},new:true});
      const job=priorityKeys.length
        ? await claim({...due,dedupeKey:{$in:priorityKeys}})
        : await claim(due);
      if(!job)break;
      try{
        await mailer().sendMail({from:{name:BRAND,address:USER()},to:job.to,subject:job.subject,text:job.text,html:job.html});
        await MailJob.updateOne({_id:job._id},{$set:{status:'sent',sentAt:new Date(),lastError:'',...(job.kind==='password_reset'?{text:'[redacted after sending]',html:'[redacted after sending]'}:{})}});
        console.log(`[MAIL] Delivered ${job.kind} notification to ${job.to}`);
      }catch(e){
        const exhausted=job.attempts>=5;
        const delayMinutes=Math.min(60,2**job.attempts);
        await MailJob.updateOne({_id:job._id},{$set:{status:exhausted?'failed':'retry',nextAttemptAt:new Date(Date.now()+delayMinutes*60000),lastError:String(e.message||e).slice(0,300)}});
        console.error(`[MAIL] ${exhausted?'Failed':'Retry scheduled'} for ${job.kind}:`,e.message);
      }
    }
  }catch(e){console.error('[MAIL] Queue worker error:',e.message)}finally{active=false}
}
export function requestDelivery(){
  // Fire-and-forget is unsafe in Vercel functions: callers flush explicitly.
  if (process.env.VERCEL) return;
  if(emailConfigured())setImmediate(()=>{void processMailQueue()});
}
export function startMailWorker(){
  if(timer)return;
  console.log(emailConfigured() ? `[MAIL] Gmail SMTP active for owner ${OWNER_EMAIL()}` : '[MAIL] Gmail SMTP not configured. Jobs will be queued until SMTP settings are provided.');
  timer=setInterval(()=>{void processMailQueue()},30000);
  timer.unref?.();
  requestDelivery();
}
