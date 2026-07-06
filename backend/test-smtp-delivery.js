const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const emailService = require('./emailService');

async function run() {
  console.log('🚀 Starting SMTP Diagnostic Test...');
  console.log('Environment configuration check:');
  console.log(' - SMTP_HOST:', process.env.SMTP_HOST);
  console.log(' - SMTP_PORT:', process.env.SMTP_PORT);
  console.log(' - SMTP_USER:', process.env.SMTP_USER);
  console.log(' - BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);

  console.log('\n🔍 Verifying SMTP connection handshake...');
  const verifyResult = await emailService.verifySMTP();
  console.log('Handshake result:', verifyResult);

  if (!verifyResult.success) {
    console.warn('⚠️ SMTP connection verification failed on handshake, testing fallback dispatch next.');
  } else {
    console.log('✅ SMTP connection verified successfully.');
  }

  console.log('\n📧 Attempting to dispatch a live test email...');
  const recipient = process.env.BREVO_SENDER_EMAIL || 'campusconnect589@gmail.com';
  console.log(`Sending to: ${recipient}`);

  const sendResult = await emailService.sendEmail(
    recipient,
    'SMTP Diagnostic',
    `Campus Connect SMTP Test - ${new Date().toISOString()}`,
    '<h3>Campus Connect SMTP Delivery Test</h3><p>If you see this email, SMTP delivery is functioning correctly!</p>'
  );

  console.log('Send result:', sendResult);
  console.log('Last email status:', emailService.getLastEmailStatus());

  if (sendResult.success) {
    console.log('🎉 Test passed successfully!');
    process.exit(0);
  } else {
    console.error('❌ Test failed to dispatch email.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('💥 Test execution crashed:', err);
  process.exit(1);
});
