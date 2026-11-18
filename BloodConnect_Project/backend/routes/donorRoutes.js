const express = require('express');
const Donor = require('../models/Donor');

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicDonor(donor, userId) {
  const result = donor.toObject();
  delete result.email;
  delete result.ownerId;
  result.ownedByCurrentUser = String(donor.ownerId) === String(userId);
  return result;
}

router.get('/', async (req, res) => {
  try {
    const { bloodGroup, city, available } = req.query;
    const query = {};
    if (bloodGroup && bloodGroup !== 'ALL') query.bloodGroup = bloodGroup;
    if (city) query.city = { $regex: escapeRegex(String(city)), $options: 'i' };
    if (available === 'true') query.available = true;

    const donors = await Donor.find(query).sort({ createdAt: -1 }).limit(200);
    res.json(donors.map((donor) => publicDonor(donor, req.user._id)));
  } catch (error) {
    console.error('Could not load donors:', error.message);
    res.status(500).json({ error: 'Could not load donors. Please try again.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const existing = await Donor.findOne({ ownerId: req.user._id });
    if (existing) return res.status(409).json({ error: 'Your account already has a donor profile.' });

    const donor = await Donor.create({
      name: body.name,
      bloodGroup: body.bloodGroup,
      city: body.city,
      phone: body.phone,
      age: body.age,
      email: req.user.email,
      ownerId: req.user._id
    });
    res.status(201).json(publicDonor(donor, req.user._id));
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Please check the donor details and try again.' });
    console.error('Could not create donor profile:', error.message);
    res.status(500).json({ error: 'Could not create the donor profile. Please try again.' });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found.' });
    if (String(donor.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the profile owner can change availability.' });
    }

    donor.available = !donor.available;
    await donor.save();
    res.json(publicDonor(donor, req.user._id));
  } catch (error) {
    console.error('Could not update donor availability:', error.message);
    res.status(400).json({ error: 'Could not update donor availability.' });
  }
});

module.exports = router;
