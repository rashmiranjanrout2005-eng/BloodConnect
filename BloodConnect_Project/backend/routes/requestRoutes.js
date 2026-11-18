const express = require('express');
const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const { sendBloodRequestAlerts } = require('../services/emailService');

const router = express.Router();
const DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicRequest(request, userId) {
  const result = request.toObject();
  delete result.requesterId;
  result.ownedByCurrentUser = String(request.requesterId) === String(userId);
  return result;
}

router.get('/', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    const query = {};
    if (bloodGroup && bloodGroup !== 'ALL') query.bloodGroup = bloodGroup;
    if (city) query.city = { $regex: escapeRegex(String(city)), $options: 'i' };

    const requests = await BloodRequest.find(query).sort({ createdAt: -1 }).limit(200);
    res.json(requests.map((request) => publicRequest(request, req.user._id)));
  } catch (error) {
    console.error('Could not load blood requests:', error.message);
    res.status(500).json({ error: 'Could not load blood requests. Please try again.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const bloodRequest = await BloodRequest.create({
      patientName: body.patientName,
      bloodGroup: body.bloodGroup,
      units: body.units,
      hospital: body.hospital,
      city: body.city,
      urgency: body.urgency,
      contactPhone: body.contactPhone,
      requesterId: req.user._id
    });

    let emailDelivery;
    try {
      const donorEmails = await Donor.find({
        available: true,
        bloodGroup: { $in: DONATE_TO[bloodRequest.bloodGroup] },
        city: { $regex: escapeRegex(bloodRequest.city), $options: 'i' }
      }).distinct('email');
      emailDelivery = await sendBloodRequestAlerts(bloodRequest, donorEmails);
    } catch (error) {
      console.error(`Blood request ${bloodRequest._id} email delivery failed:`, error.message);
      emailDelivery = {
        status: 'failed',
        sent: error.sent || 0,
        message: 'The request was posted, but donor email alerts could not be delivered.'
      };
    }

    res.status(201).json({
      request: publicRequest(bloodRequest, req.user._id),
      emailDelivery: emailDelivery.status
        ? {
            status: emailDelivery.status,
            recipientCount: emailDelivery.sent || 0,
            message: emailDelivery.message
          }
        : { status: 'sent', recipientCount: emailDelivery.sent }
    });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Please check the blood request details and try again.' });
    console.error('Could not create blood request:', error.message);
    res.status(500).json({ error: 'Could not publish the blood request. Please try again.' });
  }
});

router.patch('/:id/fulfill', async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) return res.status(404).json({ error: 'Request not found.' });
    if (String(bloodRequest.requesterId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the request owner can mark it fulfilled.' });
    }

    bloodRequest.status = 'FULFILLED';
    await bloodRequest.save();
    res.json(publicRequest(bloodRequest, req.user._id));
  } catch (error) {
    console.error('Could not fulfill blood request:', error.message);
    res.status(400).json({ error: 'Could not update the blood request.' });
  }
});

module.exports = router;
