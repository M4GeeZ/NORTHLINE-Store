import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),override:true});
import mongoose from 'mongoose';
import Product from './models/Product.js';
import products from './data/products.js';
if(!process.env.MONGO_URI)throw new Error('MONGO_URI required in server/.env');
try {await mongoose.connect(process.env.MONGO_URI); for(const product of products)await Product.updateOne({slug:product.slug},{$set:product},{upsert:true});console.log(`Seeded/updated ${products.length} products.`);} finally {await mongoose.disconnect()}
