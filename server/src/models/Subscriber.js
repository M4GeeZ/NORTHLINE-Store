import mongoose from 'mongoose';
const schema=new mongoose.Schema({email:{type:String,required:true,unique:true,lowercase:true,trim:true},consent:{type:Boolean,required:true,default:true}},{timestamps:true});
export default mongoose.model('Subscriber',schema);
