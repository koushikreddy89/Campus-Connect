const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'info@campusconnect.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Campus Connect';

let lastEmailStatus = { status: 'none', timestamp: null, error: null, recipient: null };

/**
 * Extensible email service using Brevo SMTP API v3
 */
const emailService = {
  /**
   * Generic method to send transactional email via Brevo
   */
  async sendEmail(toEmail, toName, subject, htmlContent) {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ [Email Service] BREVO_API_KEY is not defined. Email dispatch skipped.');
      console.log(`✉️ [Mock Email] To: ${toEmail}, Subject: ${subject}`);
      lastEmailStatus = { status: 'mock_sent', timestamp: new Date(), error: null, recipient: toEmail };
      return { success: true, mock: true };
    }

    console.log(`✉️ [Email Service] Preparing Brevo API call to ${toEmail}...`);
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
      
      console.log('✉️ [Email Service] Brevo Request payload:', JSON.stringify(payload, null, 2));

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
      console.log(`✉️ [Email Service] Brevo Response received. Status: ${response.status} ${response.statusText}`, JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.message || `Brevo API returned status ${response.status}`);
      }

      console.log(`✅ [Email Service] Email sent successfully to ${toEmail}. Message ID:`, data.messageId);
      lastEmailStatus = { status: 'delivered', timestamp: new Date(), messageId: data.messageId, recipient: toEmail };
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error(`❌ [Email Service] Failed to send email to ${toEmail}:`, error.message);
      lastEmailStatus = { status: 'failed', timestamp: new Date(), error: error.message, recipient: toEmail };
      return { success: false, error: error.message };
    }
  },

  /**
   * Sends the OTP verification code to a user
   */
  async sendOTP(toEmail, code, expiresMinutes = 5) {
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

  /**
   * Future email infrastructure placeholders
   */
  async sendPlacementNotification(toEmail, toName, details) {
    const subject = `New Placement Opportunity: ${details.company} - ${details.role}`;
    const htmlContent = `<h3>New Placement Opportunity</h3><p>Company: ${details.company}</p><p>Role: ${details.role}</p><p>Apply before: ${details.deadline}</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendInternshipAlert(toEmail, toName, details) {
    const subject = `New Internship Alert: ${details.company}`;
    const htmlContent = `<h3>New Internship Alert</h3><p>${details.company} is hiring for ${details.role}.</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendAdminAnnouncement(toEmail, toName, details) {
    const subject = `Official Announcement: ${details.title}`;
    const htmlContent = `<h3>${details.title}</h3><p>${details.content}</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendEventInvitation(toEmail, toName, details) {
    const subject = `Event Invitation: ${details.title}`;
    const htmlContent = `<h3>You're invited to ${details.title}</h3><p>Date: ${details.date}</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendEventNotification(toEmail, toName, details) {
    const subject = `Event Notification: ${details.title}`;
    const htmlContent = `<h3>Event Update</h3><p>${details.title}</p><p>Date: ${details.date}</p><p>${details.content || ''}</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendReferralNotification(toEmail, toName, details) {
    const subject = `Referral Request Update`;
    const htmlContent = `<h3>Referral Request</h3><p>Your referral status has been updated.</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendFriendRequestNotification(toEmail, toName, details) {
    const subject = `New Connection Request on Campus Connect`;
    const htmlContent = `<h3>Connection Request</h3><p>${details.senderName} wants to connect with you.</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendConnectionAlert(toEmail, toName, details) {
    const subject = `You are now connected!`;
    const htmlContent = `<h3>Connection Verified</h3><p>You are now connected with ${details.senderName}.</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendChatNotification(toEmail, toName, details) {
    const subject = `New Message from ${details.senderName}`;
    const htmlContent = `<h3>New Message</h3><p>${details.senderName} sent you a message: "${details.text}"</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
  },

  async sendAlumniInvitation(toEmail, toName, details) {
    const subject = `Join Campus Connect Alumni Network`;
    const htmlContent = `<h3>Alumni Invitation</h3><p>Join the official campus connect portal for alumni.</p>`;
    return this.sendEmail(toEmail, toName, subject, htmlContent);
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
