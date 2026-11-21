import 'dotenv/config'; // This will automatically load your .env file
import emailService from './src/services/email.service.js';

async function testEmail() {
  const testEmailAddress = process.argv[2];
  
  if (!testEmailAddress) {
    console.error('❌ Error: Please provide an email address to test.');
    console.error('Usage: node test-email.js <your_email@example.com>');
    process.exit(1);
  }

  const dummyOtp = '987654';
  console.log(`⏳ Attempting to send test OTP [${dummyOtp}] to ${testEmailAddress}...`);

  try {
    const success = await emailService.sendOtpEmail(testEmailAddress, dummyOtp);
    if (success) {
      console.log('✅ Email script completed execution.');
      console.log('📬 Please check your inbox (and spam folder) for the test email!');
    }
  } catch (error) {
    console.error('❌ Failed to send email. There might be an issue with your config setup.');
    console.error(error);
  }
}

testEmail();
