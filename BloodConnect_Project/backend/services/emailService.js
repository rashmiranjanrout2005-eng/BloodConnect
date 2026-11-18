const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.SMTP_PORT || 587);
const emailConfigured = Boolean(
  process.env.SMTP_HOST &&
  Number.isInteger(smtpPort) &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM
);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      requireTLS: smtpPort !== 465
    })
  : null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function verifyEmailConfiguration() {
  if (transporter) await transporter.verify();
}

async function sendBloodRequestAlerts(request, donorEmails) {
  if (!donorEmails.length) return { sent: 0, reason: 'no-matching-donors' };
  if (!transporter) {
    const error = new Error('Email delivery is not configured.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const details = [
    `Blood group: ${request.bloodGroup}`,
    `Units needed: ${request.units}`,
    `Hospital: ${request.hospital}`,
    `City: ${request.city}`,
    `Urgency: ${request.urgency}`,
    `Contact: ${request.contactPhone}`
  ].join('\n');

  let sent = 0;
  for (let index = 0; index < donorEmails.length; index += 50) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.SMTP_FROM,
        bcc: donorEmails.slice(index, index + 50),
        subject: `BloodConnect ${request.urgency} request: ${request.bloodGroup} in ${request.city}`,
        text: `A blood request matching your donor profile was posted.\n\n${details}\n\nPlease contact the requester directly if you are available.`,
        html: `<p>A blood request matching your donor profile was posted.</p><pre>${escapeHtml(details)}</pre><p>Please contact the requester directly if you are available.</p>`
      });
      sent += Math.min(50, donorEmails.length - index);
    } catch (error) {
      error.sent = sent;
      throw error;
    }
  }

  return { sent };
}

module.exports = { emailConfigured, verifyEmailConfiguration, sendBloodRequestAlerts };
