const crypto = require('crypto');
const Session = require('../models/Session');
const User = require('../models/User');

const COOKIE_NAME = 'bc_session';

function getSessionToken(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const cookie = cookies.find((part) => part.trim().startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.trim().slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${30 * 24 * 60 * 60}`
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
  setSessionCookie(res, token);
}

async function requireAuth(req, res, next) {
  try {
    const token = getSessionToken(req);
    if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

    const session = await Session.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    });
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }

    const user = await User.findById(session.userId).select('name email');
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Your account is unavailable. Please log in again.' });
    }

    req.user = user;
    req.sessionId = session._id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth, createSession, getSessionToken, hashToken, clearSessionCookie };
