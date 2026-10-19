import mongoose from 'mongoose';
const productSchema=new mongoose.Schema({name:{type:String,required:true},slug:{type:String,unique:true,required:true},category:{type:String,required:true},description:{type:String,required:true},price:{type:Number,required:true,min:0},compareAtPrice:{type:Number,min:0},images:[String],colors:[String],stock:{type:Number,default:0,min:0},featured:{type:Boolean,default:false},badge:String,rating:{type:Number,default:4.8},reviews:{type:Number,default:0},details:[String]},{timestamps:true});
export default mongoose.model('Product',productSchema);
