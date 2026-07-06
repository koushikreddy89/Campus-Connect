const nodemailer = require('nodemailer');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || 'info@campusconnect.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Campus Connect';

// SMTP Configurations
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // secure: true for port 465, false for 587 (STARTTLS)
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;
let isSmtpActive = false;
let lastEmailStatus = { status: 'none', timestamp: null, error: null, recipient: null };

if (SMTP_HOST) {
  console.log(`✉️ [Email Service] Initializing Nodemailer SMTP transporter for ${SMTP_HOST}:${SMTP_PORT}...`);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
  });

  // Verify SMTP Connection on Startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ [Email Service] Nodemailer SMTP connection verification failed on startup:', error.message);
      console.error(error.stack);
      console.warn('⚠️ [Email Service] Disabling SMTP relay route and falling back to Brevo HTTP API for all dispatches.');
      isSmtpActive = false;
    } else {
      console.log('✅ [Email Service] Nodemailer SMTP connection verified successfully.');
      isSmtpActive = true;
    }
  });
}

/**
 * Enterprise email service supporting SMTP and Brevo HTTP APIs
 */
const emailService = {
  /**
   * Generic method to send transactional email
   */
  async sendEmail(toEmail, toName, subject, htmlContent) {
    console.log(`✉️ [Email Service] Initiating email dispatch:
      - Recipient: ${toEmail}
      - Subject: ${subject}
      - SMTP Host: ${SMTP_HOST || 'Not Configured'}
      - SMTP User: ${SMTP_USER || 'Not Configured'}
      - SMTP Active: ${isSmtpActive ? 'Yes' : 'No'}`);

    const sender = `"${BREVO_SENDER_NAME}" <${BREVO_SENDER_EMAIL}>`;

    let smtpError = null;
    let smtpStack = null;

    // 1. SMTP Transporter route
    if (transporter && isSmtpActive) {
      console.log(`✉️ [Email Service] Provider selected: SMTP Relay (Nodemailer). Dispatching...`);
      try {
        const mailOptions = {
          from: sender,
          to: `"${toName || toEmail}" <${toEmail}>`,
          subject: subject,
          html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [Email Service] SMTP delivery accepted:
          - Message ID: ${info.messageId}
          - Accepted Recipients: ${JSON.stringify(info.accepted)}
          - Rejected Recipients: ${JSON.stringify(info.rejected)}
          - Response: ${info.response}`);
        
        lastEmailStatus = { 
          status: 'delivered', 
          timestamp: new Date(), 
          messageId: info.messageId, 
          recipient: toEmail,
          provider: 'smtp',
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        };
        return { 
          success: true, 
          messageId: info.messageId, 
          provider: 'smtp',
          accepted: info.accepted,
          rejected: info.rejected
        };
      } catch (error) {
        console.warn(`⚠️ [Email Service] SMTP delivery failed.
          - Error: ${error.message}
          - Stack: ${error.stack}
          Attempting fallback to HTTP API...`);
        smtpError = error.message;
        smtpStack = error.stack;
      }
    } else {
      if (transporter) {
        console.log(`✉️ [Email Service] SMTP transporter configured but inactive due to verification failure. Skipping SMTP route.`);
      }
    }

    // 2. HTTP Brevo API Fallback route
    if (BREVO_API_KEY) {
      console.log(`✉️ [Email Service] Provider selected: Brevo HTTP API. Dispatching...`);
      try {
        const payload = {
          sender: {
            name: BREVO_SENDER_NAME,
            email: BREVO_SENDER_EMAIL
          },
          to: [
            {
              email: toEmail,
              name: toName || toEmail
            }
          ],
          subject: subject,
          htmlContent: htmlContent
        };
        
        console.log('✉️ [Email Service] HTTP API Request Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`✉️ [Email Service] HTTP API Response Status: ${response.status} ${response.statusText}`);
        console.log('✉️ [Email Service] HTTP API Response Body:', JSON.stringify(data, null, 2));

        if (!response.ok) {
          throw new Error(data.message || `Brevo HTTP API returned status ${response.status}`);
        }

        console.log(`✅ [Email Service] HTTP API delivery accepted. Message ID:`, data.messageId);
        lastEmailStatus = { 
          status: 'delivered', 
          timestamp: new Date(), 
          messageId: data.messageId, 
          recipient: toEmail,
          provider: 'brevo_api',
          accepted: [toEmail],
          rejected: [],
          response: data
        };
        return { 
          success: true, 
          messageId: data.messageId, 
          provider: 'brevo_api',
          accepted: [toEmail],
          rejected: []
        };
      } catch (error) {
        console.error(`❌ [Email Service] HTTP API delivery failed:
          - Error: ${error.message}
          - Stack: ${error.stack}`);
        const combinedError = smtpError 
          ? `SMTP Error: ${smtpError}. HTTP API Error: ${error.message}` 
          : error.message;
        lastEmailStatus = { 
          status: 'failed', 
          timestamp: new Date(), 
          error: combinedError, 
          stack: error.stack,
          recipient: toEmail,
          provider: 'brevo_api'
        };
        return { 
          success: false, 
          error: combinedError, 
          stack: error.stack,
          smtpError: smtpError,
          smtpStack: smtpStack
        };
      }
    }

    // 3. No configurations found
    const missingCredsError = smtpError 
      ? `SMTP Error: ${smtpError}. No Brevo API Key configured for fallback.` 
      : 'No email service credentials configured.';
    console.error(`❌ [Email Service] Failed: ${missingCredsError}`);
    lastEmailStatus = { 
      status: 'failed', 
      timestamp: new Date(), 
      error: missingCredsError, 
      recipient: toEmail 
    };
    return { success: false, error: missingCredsError };
  },

  /**
   * Sends the OTP verification code to a user
   */
  async sendOTP(toEmail, code, expiresMinutes = 5) {
    console.log(`🔑 [Email Service] Generating OTP [${code}] for recipient: [${toEmail}] (expiry: ${expiresMinutes} mins)`);
    const subject = 'Campus Connect Verification Code';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Campus Connect Verification</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #09090B;
            color: #ECECED;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 550px;
            margin: 40px auto;
            background-color: #121214;
            border: 1px solid #1F1F23;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            background-color: #18181B;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #1F1F23;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
            color: #A78BFA;
            text-decoration: none;
          }
          .content {
            padding: 40px 30px;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            color: #FFFFFF;
            margin-top: 0;
            margin-bottom: 16px;
            text-align: center;
          }
          .description {
            font-size: 15px;
            color: #A1A1AA;
            line-height: 1.6;
            margin-bottom: 30px;
            text-align: center;
          }
          .code-container {
            background-color: #18181B;
            border: 1px solid #27272A;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .code {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 0.2em;
            color: #FFFFFF;
            font-family: "Courier New", Courier, monospace;
          }
          .expiration {
            font-size: 13px;
            color: #F59E0B;
            text-align: center;
            margin-top: 12px;
            font-weight: 500;
          }
          .warning-box {
            background-color: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 30px;
          }
          .warning-title {
            font-size: 13px;
            font-weight: 700;
            color: #EF4444;
            margin-top: 0;
            margin-bottom: 6px;
          }
          .warning-text {
            font-size: 12px;
            color: #F87171;
            margin: 0;
            line-height: 1.5;
          }
          .footer {
            background-color: #18181B;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #1F1F23;
            font-size: 12px;
            color: #71717A;
          }
          .footer-logo {
            font-weight: 700;
            color: #A1A1AA;
            margin-bottom: 8px;
            display: inline-block;
          }
          .footer-links a {
            color: #A78BFA;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">Campus Connect</span>
          </div>
          <div class="content">
            <h2 class="title">Verify Your Account</h2>
            <p class="description">
              Use the single-use verification code below to complete your login or registration on Campus Connect.
            </p>
            <div class="code-container">
              <div class="code">${code}</div>
              <div class="expiration">Code expires in ${expiresMinutes} minutes</div>
            </div>
            <div class="warning-box">
              <div class="warning-title">⚠️ Security Warning</div>
              <p class="warning-text">
                This verification code is confidential. Never share this code with anyone, including campus administrators. If you did not request this login attempt, please ignore this email.
              </p>
            </div>
          </div>
          <div class="footer">
            <span class="footer-logo">Campus Connect Platform</span>
            <p>Connect. Learn. Grow. Build Your Campus Network.</p>
            <p class="footer-links">
              <a href="#">Support</a> &bull; <a href="#">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(toEmail, toEmail, subject, htmlContent);
  },

  async verifySMTP() {
    if (!transporter) {
      return { success: false, error: 'SMTP transporter is not initialized.' };
    }
    try {
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully.' };
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  },

  getLastEmailStatus() {
    return lastEmailStatus;
  },

  async verifyAPIKey() {
    if (!BREVO_API_KEY) {
      return { valid: false, error: 'BREVO_API_KEY is not defined in the environment.' };
    }
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY
        }
      });
      const data = await response.json();
      if (!response.ok) {
        return { valid: false, error: data.message || `Brevo API returned status ${response.status}` };
      }
      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  async verifySender() {
    if (!BREVO_API_KEY) {
      return { verified: false, error: 'BREVO_API_KEY is not defined.' };
    }
    try {
      const response = await fetch('https://api.brevo.com/v3/senders', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY
        }
      });
      const data = await response.json();
      if (!response.ok) {
        return { verified: false, error: data.message || `Brevo API returned status ${response.status}` };
      }
      const senders = data.senders || [];
      const isVerified = senders.some(s => s.email.toLowerCase() === BREVO_SENDER_EMAIL.toLowerCase() && s.active);
      return { verified: isVerified, senders };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }
};

module.exports = emailService;
