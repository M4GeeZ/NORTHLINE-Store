import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import {auth} from '../middleware/auth.js';
import {queueMail,emailConfigured,processMailQueue} from '../services/mail.js';
import {verifyFirebaseToken} from '../services/firebase.js';

const router=Router();
const email=z.string().trim().email().max(150).transform(v=>v.toLowerCase());
const registerSchema=z.object({name:z.string().trim().min(2).max(80),email,password:z.string().min(8).max(128)});
const loginSchema=z.object({email,password:z.string().min(1)});
const passwordSchema=z.string().min(8).max(128).regex(/[a-zA-Z]/,'Password needs a letter').regex(/\d/,'Password needs a number');
const tokenFor=user=>jwt.sign({id:user._id.toString(),tv:user.tokenVersion||0},process.env.JWT_SECRET,{expiresIn:'7d'});
const publicUser=user=>({id:user._id,name:user.name,email:user.email||'',phone:user.phone||'',role:user.role,hasPassword:!!user.password});
const errorText='If a password account exists for that email, a recovery code will be sent shortly.';
const hash=(value,context)=>createHmac('sha256',process.env.JWT_SECRET).update(`${context}:${value}`).digest('hex');
const equals=(a,b)=>a&&b&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const recoveryLimit=rateLimit({windowMs:60*60*1000,limit:9,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Too many recovery attempts. Please try again later.'}});

router.post('/register',async(req,res,next)=>{try{
 const data=registerSchema.parse(req.body);
 if(await User.exists({email:data.email}))return res.status(409).json({message:'An account already exists with this email.'});
 const user=await User.create({...data,password:await bcrypt.hash(data.password,12)});
 res.status(201).json({user:publicUser(user),token:tokenFor(user)});
}catch(e){next(e)}});
router.post('/login',async(req,res,next)=>{try{
 const data=loginSchema.parse(req.body);
 const user=await User.findOne({email:data.email}).select('+password');
 if(!user?.password||!await bcrypt.compare(data.password,user.password))return res.status(401).json({message:'Incorrect email or password. If you used Google or phone sign-in, continue with that option.'});
 res.json({user:publicUser(user),token:tokenFor(user)});
}catch(e){next(e)}});

// Tokens are signed and verified by the Firebase Admin SDK: the browser cannot invent a login.
router.post('/firebase',async(req,res,next)=>{try{
 const {idToken}=z.object({idToken:z.string().min(100).max(10000)}).parse(req.body);
 const decoded=await verifyFirebaseToken(idToken);
 const provider=decoded.firebase?.sign_in_provider;
 if(!['google.com','phone'].includes(provider))return res.status(403).json({message:'Use verified Google or phone authentication.'});
 const verifiedEmail=provider==='google.com'&&decoded.email_verified&&decoded.email?decoded.email.toLowerCase():null;
 const verifiedPhone=provider==='phone'&&decoded.phone_number?decoded.phone_number:null;
 if(!verifiedEmail&&!verifiedPhone)return res.status(403).json({message:'A verified Google email or phone is required.'});
 let user=await User.findOne({firebaseUid:decoded.uid}).select('+password');
 if(!user&&verifiedEmail)user=await User.findOne({email:verifiedEmail}).select('+password');
 if(!user&&verifiedPhone)user=await User.findOne({phone:verifiedPhone}).select('+password');
 if(user){
  if(user.firebaseUid&&user.firebaseUid!==decoded.uid)return res.status(409).json({message:'This account is already linked to another verified sign-in.'});
  if(!user.firebaseUid){user.firebaseUid=decoded.uid;await user.save()}
 }else{
  user=await User.create({name:decoded.name?.slice(0,80)||'Northline member',...(verifiedEmail?{email:verifiedEmail}:{}),...(verifiedPhone?{phone:verifiedPhone}:{}),firebaseUid:decoded.uid});
 }
 res.json({user:publicUser(user),token:tokenFor(user)});
}catch(e){if(e.code?.startsWith?.('auth/')||String(e.message).includes('Firebase ID token'))return res.status(401).json({message:'Social sign-in expired. Please try again.'});next(e)}});

router.post('/forgot/request',recoveryLimit,async(req,res,next)=>{try{
 const address=email.parse(req.body.email);
 // Always generic; do not disclose the existence of accounts or login method.
 const user=await User.findOne({email:address}).select('+password');
 if(user?.password&&emailConfigured()){
  const now=Date.now();const latest=await PasswordReset.findOne({email:address}).sort({createdAt:-1});
  const hourlyCount=await PasswordReset.countDocuments({email:address,createdAt:{$gt:new Date(now-60*60_000)}});
  // Per-address throttle, prevents flooding inboxes even from rotating IPs.
  if(hourlyCount<3&&(!latest||now-latest.createdAt.getTime()>90_000)){
   const code=String(randomInt(0,1000000)).padStart(6,'0');
   await PasswordReset.updateMany({email:address,status:{$in:['otp','verified']}},{$set:{status:'used'}});
   const reset=await PasswordReset.create({email:address,codeHash:'pending',expiresAt:new Date(now+10*60_000)});
   reset.codeHash=hash(code,reset.id);await reset.save();
   await queueMail({dedupeKey:`password-reset:${reset.id}`,kind:'password_reset',to:address,expiresAt:new Date(now+60*60_000),
    subject:'NORTHLINE | Your password reset code',
    text:`Your NORTHLINE verification code is ${code}. This code expires in 10 minutes. If you didn't request this, you can ignore this email. Do not share this code.`,
    html:`<div style="background:#f3f2ed;padding:36px 16px;font-family:Arial,sans-serif;color:#20382b"><div style="max-width:540px;background:#fff;margin:auto;padding:35px"><h2>NORTHLINE ✳</h2><h1>Reset your password</h1><p>Use this one-time code to reset your NORTHLINE account password:</p><div style="font-size:37px;font-weight:700;letter-spacing:12px;text-align:center;background:#eaf0e6;padding:24px;margin:20px 0">${code}</div><p>Expires in 10 minutes. Never share this code with anyone.</p><p>If you didn't request this, ignore this email.</p></div></div>`});
   if (process.env.VERCEL) await processMailQueue();
  }
 }
 res.json({message:errorText});
}catch(e){next(e)}});

router.post('/forgot/verify',recoveryLimit,async(req,res,next)=>{try{
 const data=z.object({email,code:z.string().regex(/^\d{6}$/)}).parse(req.body);
 const reset=await PasswordReset.findOneAndUpdate({email:data.email,status:'otp',expiresAt:{$gt:new Date()},attempts:{$lt:5}},{$inc:{attempts:1}},{sort:{createdAt:-1},new:true});
 if(!reset||!equals(hash(data.code,reset.id),reset.codeHash))return res.status(400).json({message:'Incorrect or expired code. Please check and try again.'});
 const token=randomBytes(32).toString('hex');
 reset.status='verified';reset.verifiedAt=new Date();reset.challengeHash=hash(token,reset.id);await reset.save();
 res.json({resetId:reset.id,resetToken:token,message:'Email verified. Create your new password.'});
}catch(e){next(e)}});

router.post('/forgot/reset',recoveryLimit,async(req,res,next)=>{try{
 const data=z.object({resetId:z.string().regex(/^[a-f\d]{24}$/i),resetToken:z.string().regex(/^[a-f\d]{64}$/i),password:passwordSchema}).parse(req.body);
 const reset=await PasswordReset.findOne({_id:data.resetId,status:'verified',expiresAt:{$gt:new Date()}});
 if(!reset||!equals(hash(data.resetToken,reset.id),reset.challengeHash))return res.status(400).json({message:'Reset session expired. Request another code.'});
 // Consume before updating credentials: two concurrent resets cannot reuse the token.
 const used=await PasswordReset.updateOne({_id:reset._id,status:'verified'},{$set:{status:'used'}});
 if(used.modifiedCount!==1)return res.status(409).json({message:'This reset link has already been used.'});
 const password=await bcrypt.hash(data.password,12);
 await User.updateOne({email:reset.email},{$set:{password},$inc:{tokenVersion:1}});
 res.json({message:'Password updated. Sign in using your new password.'});
}catch(e){next(e)}});
router.get('/me',auth,(req,res)=>res.json({user:publicUser(req.user)}));
export default router;
