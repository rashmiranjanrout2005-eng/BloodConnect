const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    bloodGroup: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    totalDonations: { type: Number, default: 0 },
    lastDonationDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donor', donorSchema);
