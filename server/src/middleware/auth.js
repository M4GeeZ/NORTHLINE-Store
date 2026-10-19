import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function auth(req,res,next){try{const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({message:'Sign in to continue.'});const payload=jwt.verify(token,process.env.JWT_SECRET);req.user=await User.findById(payload.id);if(!req.user||Number(req.user.tokenVersion||0)!==Number(payload.tv||0))return res.status(401).json({message:'Account not found.'});next()}catch{return res.status(401).json({message:'Your session has expired. Please sign in again.'})}}
export function admin(req,res,next){if(req.user?.role!=='admin')return res.status(403).json({message:'Admin access only.'});next()}
