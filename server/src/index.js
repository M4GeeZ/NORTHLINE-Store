import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)), override:true});
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import {ZodError} from 'zod';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import Product from './models/Product.js';
import seedProducts from './data/products.js';
import communityRoutes from './routes/community.js';
import notificationRoutes from './routes/notifications.js';
import {startMailWorker} from './services/mail.js';

const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:(process.env.CLIENT_URL||'http://localhost:5173').split(',').map(x=>x.trim())}));
app.use(express.json({limit:'150kb'}));
app.use(morgan('dev'));
app.get('/api/health',(_,res)=>res.json({ok:true,service:'northline-api',database:mongoose.connection.readyState===1?'connected':'disconnected'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}),authRoutes);
app.use('/api/products',productRoutes);
app.use('/api/orders',orderRoutes);
app.use('/api',communityRoutes);
app.use('/api',notificationRoutes);
app.use((req,res)=>res.status(404).json({message:'Route not found'}));
app.use((error,req,res,next)=>{
 if(error.status&&error.status>=400&&error.status<600)return res.status(error.status).json({message:error.message});
 if(error instanceof ZodError)return res.status(400).json({message:error.issues[0]?.message||'Invalid input'});
 if(error.code===11000)return res.status(409).json({message:'A record with this value already exists.'});
 if(error.name==='CastError')return res.status(400).json({message:'Invalid identifier'});
 console.error('API error:',error.message);res.status(500).json({message:'Something went wrong. Please try again.'});
});
const {MONGO_URI,JWT_SECRET}=process.env;
if(!MONGO_URI||!JWT_SECRET||JWT_SECRET.length<32){
 console.error('CONFIG ERROR: Create server/.env and set MONGO_URI (Atlas URI) and JWT_SECRET (32+ characters).');
 process.exit(1);
}
try{
 await mongoose.connect(MONGO_URI,{serverSelectionTimeoutMS:12000});
 console.log('✔ MongoDB connected to database:',mongoose.connection.name);
 if(process.env.AUTO_SEED !== 'false'){const result=await Product.bulkWrite(seedProducts.map(p=>({updateOne:{filter:{slug:p.slug},update:{$setOnInsert:p},upsert:true}})));console.log(`✔ Catalog ready: ${seedProducts.length} starter products, ${result.upsertedCount} newly added`)}
 startMailWorker();
 app.listen(Number(process.env.PORT)||5000,()=>console.log(`✔ NORTHLINE API ready http://localhost:${process.env.PORT||5000}/api/health`));
}catch(e){
 console.error('MongoDB connection error:',e.message);
 console.error('Check server/.env MONGO_URI (not localhost), Atlas user/password, and Network Access IP allowlist.');
 process.exit(1);
}
