import {Router} from 'express';
import {z} from 'zod';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Product from '../models/Product.js';
import MailJob from '../models/MailJob.js';
import {auth,admin} from '../middleware/auth.js';
import {emailInfo,queueCartEmail,queueTestEmail,requestDelivery,processMailQueue} from '../services/mail.js';

const router=Router();
const cartLimiter=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
const testLimiter=rateLimit({windowMs:60*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
const cartEventSchema=z.object({
  eventId:z.string().uuid(),
  productId:z.string().refine(mongoose.isValidObjectId,{message:'Invalid product ID'}),
  quantity:z.number().int().min(1).max(20),
  finish:z.string().trim().max(80).optional()
});

router.post('/cart-events',cartLimiter,async(req,res,next)=>{
  try{
    const data=cartEventSchema.parse(req.body);
    const product=await Product.findById(data.productId);
    if(!product||product.stock<1)return res.status(404).json({message:'This product is unavailable.'});
    if(data.finish && product.colors?.length && !product.colors.includes(data.finish))return res.status(400).json({message:'Invalid finish.'});
    let user=null;
    // Only attach an authenticated account identity (email ownership is not independently verified). Anonymous bag alerts have no email address.
    try{
      const token=req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      if(token){const data=jwt.verify(token,process.env.JWT_SECRET);user=await User.findById(data.id).select('name email')}
    }catch{/* Guest browsing is allowed */}
    const queued=await queueCartEmail({eventId:data.eventId,product,quantity:data.quantity,finish:data.finish||'',user});
    res.status(202).json({queued,deliveryConfigured:emailInfo().configured});
  }catch(error){next(error)}
});
router.get('/admin/email-notifications',auth,admin,async(req,res,next)=>{
  try{
    const [jobs,stats]=await Promise.all([
      MailJob.find().select('-html -text').sort({createdAt:-1}).limit(100).lean(),
      MailJob.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
    ]);
    res.json({configuration:emailInfo(),jobs,counts:Object.fromEntries(stats.map(x=>[x._id,x.count]))});
  }catch(e){next(e)}
});
router.post('/admin/email-notifications/test',auth,admin,testLimiter,async(req,res,next)=>{
  try{if(!emailInfo().configured)return res.status(503).json({message:'Configure SMTP_USER, SMTP_APP_PASSWORD and STORE_OWNER_EMAIL in server/.env first.'});
    await queueTestEmail();res.status(202).json({message:'Test email queued. Check the email activity table and your inbox.'});
  }catch(e){next(e)}
});
router.post('/admin/email-notifications/:id/retry',auth,admin,async(req,res,next)=>{
  try{
    if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid ID.'});
    const job=await MailJob.findOneAndUpdate({_id:req.params.id,status:{$in:['failed','retry']}},{$set:{status:'pending',attempts:0,lastError:'',nextAttemptAt:new Date()}},{new:true});
    if(!job)return res.status(409).json({message:'Only failed or retrying emails can be restarted.'});
    if (process.env.VERCEL) await processMailQueue(); else requestDelivery();
    res.json({message:'Email retry queued.'});
  }catch(e){next(e)}
});
export default router;
