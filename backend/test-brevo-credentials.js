require('dotenv').config();

async function testBrevo() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'campusconnect589@gmail.com';
  console.log('Key:', apiKey ? 'Present (length: ' + apiKey.length + ')' : 'Missing');
  console.log('Sender:', senderEmail);

  if (!apiKey) {
    console.error('Error: BREVO_API_KEY is missing');
    process.exit(1);
  }

  try {
    console.log('\n--- 1. Testing Account API ---');
    const accRes = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, 'accept': 'application/json' }
    });
    console.log('Account API HTTP Status:', accRes.status);
    const accData = await accRes.json();
    console.log('Account Data:', JSON.stringify(accData, null, 2));

    console.log('\n--- 2. Testing Senders API ---');
    const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': apiKey, 'accept': 'application/json' }
    });
    console.log('Senders API HTTP Status:', sendersRes.status);
    const sendersData = await sendersRes.json();
    console.log('Senders Data:', JSON.stringify(sendersData, null, 2));

    if (sendersData.senders) {
      const matched = sendersData.senders.find(s => s.email.toLowerCase() === senderEmail.toLowerCase());
      console.log(`\nIs sender [${senderEmail}] verified and active?`, matched ? matched.active : 'Not Found');
    }
  } catch (err) {
    console.error('Connection/Request Error:', err);
  }
}

testBrevo();
