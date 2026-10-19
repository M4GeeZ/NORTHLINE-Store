import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 email:{type:String,required:true,lowercase:true,index:true},
 codeHash:{type:String,required:true},
 challengeHash:{type:String},
 status:{type:String,enum:['otp','verified','used'],default:'otp'},
 attempts:{type:Number,default:0},
 expiresAt:{type:Date,required:true},
 verifiedAt:Date,
 createdAt:{type:Date,default:Date.now}
});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('PasswordReset',schema);
