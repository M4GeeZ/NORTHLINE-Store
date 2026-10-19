import mongoose from 'mongoose';

// Persistent transactional-email outbox. Delivery status is visible only to admins.
const mailJobSchema = new mongoose.Schema({
  dedupeKey: {type: String, required: true, unique: true},
  kind: {type: String, enum: ['cart_added', 'order_owner', 'order_customer', 'test', 'password_reset'], required: true},
  to: {type: String, required: true, lowercase: true, trim: true},
  subject: {type: String, required: true},
  html: {type: String, required: true},
  text: {type: String, required: true},
  status: {type: String, enum: ['pending', 'sending', 'retry', 'sent', 'failed'], default: 'pending'},
  attempts: {type: Number, default: 0},
  nextAttemptAt: {type: Date, default: Date.now},
  sentAt: Date,
  lastError: {type: String, default: ''},
  expiresAt: {type: Date}
}, {timestamps: true});
mailJobSchema.index({status: 1, nextAttemptAt: 1, createdAt: 1});
mailJobSchema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('MailJob', mailJobSchema);
