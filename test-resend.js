// Quick test script to verify Resend email sending
const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResendEmail() {
  console.log('🔍 Testing Resend email configuration...');
  console.log('API Key:', process.env.RESEND_API_KEY ? 'Found' : 'Missing');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'InstaScrapper <onboarding@resend.dev>',
      to: ['yousaf.zahid@bitbash.dev'], // sending to yourself for testing
      subject: 'Test Email - InstaScrapper Ban Notification',
      html: `
        <h1>Test Email</h1>
        <p>This is a test to verify Resend email sending is working.</p>
        <p>If you receive this, the email configuration is correct!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data?.id);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

testResendEmail();
