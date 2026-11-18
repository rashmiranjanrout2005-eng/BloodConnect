const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  bloodGroup: { 
    type: String, 
    required: true, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] 
  },
  city: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  age: { type: Number, required: true, min: 18, max: 65 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

donorSchema.index(
  { ownerId: 1 },
  { unique: true, partialFilterExpression: { ownerId: { $exists: true } } }
);

module.exports = mongoose.model('Donor', donorSchema);
