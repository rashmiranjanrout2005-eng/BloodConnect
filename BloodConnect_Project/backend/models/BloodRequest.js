const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  patientName: { type: String, required: true, trim: true },
  bloodGroup: { 
    type: String, 
    required: true, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] 
  },
  units: { type: Number, required: true, min: 1 },
  hospital: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  urgency: { 
    type: String, 
    enum: ['CRITICAL', 'URGENT', 'SCHEDULED'], 
    default: 'URGENT' 
  },
  contactPhone: { type: String, required: true, trim: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['OPEN', 'FULFILLED'], 
    default: 'OPEN' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
