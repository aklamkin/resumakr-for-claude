import { Resend } from 'resend';
import { log } from '../utils/logger.js';

// Initialize Resend client (only if API key is configured)
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  log.info('Email service initialized', { provider: 'resend' });
} else {
  log.warn('Email service not configured - RESEND_API_KEY not set');
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Resumakr <noreply@resumakr.us>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} token - Password reset token
 * @param {string} userName - User's name for personalization
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPasswordResetEmail(email, token, userName = 'there') {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  if (!resend) {
    // In development without email configured, log the link
    log.warn('Email service not configured - logging reset link', {
      email,
      resetLink,
      note: 'Set RESEND_API_KEY to enable email sending'
    });

    // Return success in dev mode so flow continues
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, devMode: true };
    }

    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your Resumakr password',
      html: generatePasswordResetHtml(userName, resetLink),
      text: generatePasswordResetText(userName, resetLink)
    });

    if (error) {
      log.error('Failed to send password reset email', { email, error: error.message });
      return { success: false, error: error.message };
    }

    log.info('Password reset email sent', { email, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (error) {
    log.error('Error sending password reset email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email content for password reset
 */
function generatePasswordResetHtml(userName, resetLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Resumakr</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

    <p>Hi ${escapeHtml(userName)},</p>

    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
    </div>

    <p style="color: #666; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>

    <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; margin-bottom: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Resumakr. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content for password reset
 */
function generatePasswordResetText(userName, resetLink) {
  return `
Reset Your Password

Hi ${userName},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
Resumakr - Build Your Perfect Resume
  `.trim();
}

/**
 * Escape HTML to prevent XSS in email templates
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send admin invite email
 * @param {string} email - New admin's email
 * @param {string} inviterName - Name of admin who sent the invite
 */
export async function sendAdminInviteEmail(email, inviterName) {
  const configUrl = (process.env.CONFIG_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '') + '/config/login';

  if (!resend) {
    log.warn('Email service not configured - logging admin invite', {
      email,
      inviterName,
      configUrl,
      note: 'Set RESEND_API_KEY to enable email sending'
    });

    if (process.env.NODE_ENV !== 'production') {
      return { success: true, devMode: true };
    }
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You've been added as a Resumakr admin",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Resumakr Admin</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">You're an Admin Now</h2>
    <p>Hi,</p>
    <p><strong>${escapeHtml(inviterName)}</strong> has added you as an administrator for Resumakr. You now have access to the admin configuration panel.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${configUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Admin Panel</a>
    </div>
    <p style="color: #666; font-size: 14px;">Log in with your Google account or email credentials to get started.</p>
    <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">If you believe this was sent in error, please contact ${escapeHtml(inviterName)}.</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Resumakr. All rights reserved.</p>
  </div>
</body>
</html>`.trim(),
      text: `You've been added as a Resumakr admin\n\n${inviterName} has added you as an administrator for Resumakr.\n\nLog in to the admin panel: ${configUrl}\n\nIf you believe this was sent in error, please contact ${inviterName}.`
    });

    if (error) {
      log.error('Failed to send admin invite email', { email, error: error.message });
      return { success: false, error: error.message };
    }

    log.info('Admin invite email sent', { email, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (error) {
    log.error('Error sending admin invite email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send admin removed email
 * @param {string} email - Removed admin's email
 * @param {string} removerName - Name of admin who removed them
 */
export async function sendAdminRemovedEmail(email, removerName) {
  if (!resend) {
    log.warn('Email service not configured - logging admin removal', {
      email,
      removerName,
      note: 'Set RESEND_API_KEY to enable email sending'
    });

    if (process.env.NODE_ENV !== 'production') {
      return { success: true, devMode: true };
    }
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Resumakr admin access has been removed',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Resumakr Admin</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Admin Access Removed</h2>
    <p>Hi,</p>
    <p>Your administrator access to Resumakr has been removed by <strong>${escapeHtml(removerName)}</strong>.</p>
    <p>You will no longer be able to access the admin configuration panel. Your regular Resumakr account (if any) is not affected.</p>
    <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">If you believe this was done in error, please contact ${escapeHtml(removerName)}.</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Resumakr. All rights reserved.</p>
  </div>
</body>
</html>`.trim(),
      text: `Your Resumakr admin access has been removed\n\nYour administrator access to Resumakr has been removed by ${removerName}.\n\nYou will no longer be able to access the admin configuration panel. Your regular Resumakr account (if any) is not affected.\n\nIf you believe this was done in error, please contact ${removerName}.`
    });

    if (error) {
      log.error('Failed to send admin removal email', { email, error: error.message });
      return { success: false, error: error.message };
    }

    log.info('Admin removal email sent', { email, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (error) {
    log.error('Error sending admin removal email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  sendPasswordResetEmail,
  sendAdminInviteEmail,
  sendAdminRemovedEmail
};
