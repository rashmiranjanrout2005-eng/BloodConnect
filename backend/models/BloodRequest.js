const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    bloodGroup: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    unitsRequired: { type: Number, required: true, default: 1 },
    urgency: { type: String, enum: ['Critical', 'Urgent', 'Scheduled'], default: 'Urgent' },
    hospital: { type: String, required: true },
    city: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Matched', 'Completed'], default: 'Active' },
    matchedDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
