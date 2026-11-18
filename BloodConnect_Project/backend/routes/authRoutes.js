const crypto = require('crypto');
const express = require('express');
const { promisify } = require('util');
const User = require('../models/User');
const Session = require('../models/Session');
const {
  requireAuth,
  createSession,
  getSessionToken,
  hashToken,
  clearSessionCookie
} = require('../middleware/requireAuth');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function passwordHash(password, salt) {
  return scrypt(password, salt, 64);
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

router.post('/register', async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Enter a valid name and email address.' });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 10 and 128 characters.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      name,
      email,
      passwordSalt: salt,
      passwordHash: (await passwordHash(password, salt)).toString('hex')
    });
    await createSession(user._id, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Please check the account details and try again.' });
    console.error('Account registration failed:', error.message);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash +passwordSalt');
    if (!user || !password || password.length > 128) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const actualHash = await passwordHash(password, user.passwordSalt);
    const expectedHash = Buffer.from(user.passwordHash, 'hex');
    if (actualHash.length !== expectedHash.length || !crypto.timingSafeEqual(actualHash, expectedHash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    await createSession(user._id, res);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Account login failed:', error.message);
    res.status(500).json({ error: 'Could not log in. Please try again.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', async (req, res) => {
  try {
    const token = getSessionToken(req);
    if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
    clearSessionCookie(res);
    res.json({ message: 'You have been logged out.' });
  } catch (error) {
    console.error('Account logout failed:', error.message);
    res.status(500).json({ error: 'Could not log out. Please try again.' });
  }
});

module.exports = router;
