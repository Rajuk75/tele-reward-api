import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import notificationService from '../src/services/notification.service.js';
import fcmService from '../src/services/fcm.service.js';

async function sendSpecificUserNotification() {
    try {
        const targetUserId = '69ea5624a772598092eb3b18';
        console.log(`--- Sending Notification to User: ${targetUserId} ---`);
        
        // 1. Connect to DB
        await connectDB();
        
        // 2. Initialize FCM
        fcmService.initialize();
        if (!fcmService.isEnabled) {
            console.error('FCM is not enabled! Check your .env');
            process.exit(1);
        }

        // 3. Send Notification
        const result = await notificationService.sendNotification({
            userId: targetUserId,
            title: 'Hey Ambika Jha! 🚀',
            body: 'Ye special notification sirf aapke liye hai. Integration testing successful!',
            type: 'offer',
            metadata: {
                offerId: '69ea756593ad4ee0a9c53d78'
            }
        });

        console.log('✅ Notification sent and saved to DB');
        console.log('Notification ID:', result._id);
        
        setTimeout(() => {
            mongoose.connection.close();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error('Failed to send notification:', error.message);
        process.exit(1);
    }
}

sendSpecificUserNotification();
