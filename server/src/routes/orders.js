import {Router} from 'express';
import {z} from 'zod';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import {auth,admin} from '../middleware/auth.js';
import {queueOrderEmails} from '../services/mail.js';
const router=Router();
// Prevent a single signed-in account from generating unlimited order emails.
const orderLimiter=rateLimit({windowMs:60*60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,keyGenerator:req=>req.user._id.toString()});
const checkout=z.object({
 items:z.array(z.object({productId:z.string(),quantity:z.number().int().min(1).max(20),finish:z.string().max(80).optional()})).min(1).max(40),
 shipping:z.object({fullName:z.string().min(2),email:z.string().email(),address:z.string().min(5),city:z.string().min(2),postalCode:z.string().min(2),country:z.string().min(2)})
});
router.post('/',auth,orderLimiter,async(req,res,next)=>{
 try{
  const data=checkout.parse(req.body);
  const totals=new Map();
  for(const item of data.items){
   if(!mongoose.isValidObjectId(item.productId))return res.status(400).json({message:'Live catalog connection required for checkout.'});
   totals.set(item.productId,(totals.get(item.productId)||0)+item.quantity);
  }
  const products=await Product.find({_id:{$in:[...totals.keys()]}});
  if(products.length!==totals.size)return res.status(400).json({message:'A product in your bag is no longer available.'});
  const lookup=new Map(products.map(p=>[p.id,p]));
  for(const p of products)if(totals.get(p.id)>20||totals.get(p.id)>p.stock)return res.status(409).json({message:`Not enough stock for ${p.name}. Please adjust quantity.`});
  const items=data.items.map(item=>{
   const p=lookup.get(item.productId);
   return {product:p._id,name:p.name,image:p.images[0],finish:(p.colors||[]).includes(item.finish)?item.finish:'',price:p.price,quantity:item.quantity};
  });
  const subtotal=items.reduce((sum,i)=>sum+i.price*i.quantity,0);
  const shippingCost=subtotal>=150?0:12;
  const decremented=[];
  for(const p of products){
   const quantity=totals.get(p.id);
   const updated=await Product.updateOne({_id:p._id,stock:{$gte:quantity}},{$inc:{stock:-quantity}});
   if(updated.modifiedCount!==1){
    for(const done of decremented)await Product.updateOne({_id:done.id},{$inc:{stock:done.quantity}});
    return res.status(409).json({message:'Stock changed. Please review your bag.'});
   }
   decremented.push({id:p._id,quantity});
  }
  try{
   const order=await Order.create({user:req.user._id,items,shipping:data.shipping,subtotal,shippingCost,total:subtotal+shippingCost});
   // Stock and order are committed first. Email delivery never determines whether
   // a customer's successful order survives an SMTP outage.
   let notifications={queued:0,total:2,configured:false};
   try{notifications=await queueOrderEmails(order,req.user)}
   catch(mailError){console.error('[MAIL] Queueing failed for order',String(order._id),mailError.message)}
   return res.status(201).json({order,notifications});
  }catch(error){
   for(const done of decremented)await Product.updateOne({_id:done.id},{$inc:{stock:done.quantity}});
   throw error;
  }
 }catch(error){next(error)}
});
router.get('/my',auth,async(req,res,next)=>{try{res.json({orders:await Order.find({user:req.user._id}).sort({createdAt:-1})})}catch(e){next(e)}});
router.get('/all',auth,admin,async(req,res,next)=>{try{res.json({orders:await Order.find().populate('user','name email').sort({createdAt:-1}).limit(200)})}catch(e){next(e)}});
router.patch('/:id/status',auth,admin,async(req,res,next)=>{
 try{
  const {status}=z.object({status:z.enum(['placed','processing','shipped','delivered','cancelled'])}).parse(req.body);
  const order=await Order.findById(req.params.id);
  if(!order)return res.status(404).json({message:'Order not found'});
  if(order.status==='cancelled'&&status!=='cancelled')return res.status(409).json({message:'A cancelled order cannot be reopened in this demo.'});
  const wasCancelled=order.status==='cancelled';
  order.status=status;await order.save();
  if(status==='cancelled'&&!wasCancelled){for(const item of order.items)await Product.updateOne({_id:item.product},{$inc:{stock:item.quantity}})}
  res.json({order});
 }catch(e){next(e)}
});
export default router;
