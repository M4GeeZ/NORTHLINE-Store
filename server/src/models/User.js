import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
 name:{type:String,required:true,trim:true},
 email:{type:String,lowercase:true,trim:true},
 phone:{type:String,trim:true},
 firebaseUid:{type:String,trim:true},
 password:{type:String,select:false},
 role:{type:String,enum:['customer','admin'],default:'customer'},
 tokenVersion:{type:Number,default:0}
},{timestamps:true});
userSchema.index({email:1},{unique:true,partialFilterExpression:{email:{$type:'string'}}});
userSchema.index({phone:1},{unique:true,partialFilterExpression:{phone:{$type:'string'}}});
userSchema.index({firebaseUid:1},{unique:true,partialFilterExpression:{firebaseUid:{$type:'string'}}});
export default mongoose.model('User',userSchema);
