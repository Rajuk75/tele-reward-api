import notificationService from '../src/services/notification.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testDeepLink() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const targetUserId = '69ea5624a772598092eb3b18'; // Aapki User ID
    const testOfferId = '69ea5624a772598092eb3c20'; // Koi bhi valid Offer ID

    console.log('--- Sending Deep Link Notification (Offer) ---');
    
    await notificationService.sendNotification({
        userId: targetUserId,
        title: 'New Offer for You! 💸',
        body: 'Click to view details and earn coins now!',
        type: 'offer',
        metadata: {
            offerId: testOfferId
        }
    });

    console.log('✅ Sent! Now click the notification on your phone.');
    process.exit(0);
}

testDeepLink();
