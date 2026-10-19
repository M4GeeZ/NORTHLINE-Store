// One-time safe migration for V4 -> V5 phone users: changes email unique index
// to a partial unique index so phone-only accounts have no fake email address.
// V4's email index is unique and rejects a second document with missing email.
import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url)),override:true});
import mongoose from 'mongoose';
import User from '../models/User.js';
if(!process.env.MONGO_URI){console.error('Set MONGO_URI in server/.env first');process.exit(1)}
try{
 await mongoose.connect(process.env.MONGO_URI,{autoIndex:false});
 const collection=User.collection;
 const indexes=await collection.indexes();
 const old=indexes.find(i=>i.name==='email_1'&&i.unique&&!i.partialFilterExpression);
 if(old){
  const duplicates=await collection.aggregate([{$match:{email:{$exists:true}}},{$group:{_id:'$email',total:{$sum:1}}},{$match:{total:{$gt:1}}}]).toArray();
  if(duplicates.length)throw new Error('Duplicate emails exist; resolve them before migration.');
  await collection.dropIndex('email_1');
  console.log('Removed V4 email_1 index.');
 }
 await collection.createIndex({email:1},{name:'email_1',unique:true,partialFilterExpression:{email:{$type:'string'}}});
 await collection.createIndex({phone:1},{name:'phone_1',unique:true,partialFilterExpression:{phone:{$type:'string'}}});
 await collection.createIndex({firebaseUid:1},{name:'firebaseUid_1',unique:true,partialFilterExpression:{firebaseUid:{$type:'string'}}});
 console.log('✔ Auth indexes migrated. Existing users and orders were preserved.');
}catch(e){console.error('Auth migration failed:',e.message);process.exitCode=1}finally{await mongoose.disconnect()}
