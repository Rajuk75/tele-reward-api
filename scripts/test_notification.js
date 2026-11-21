import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import notificationService from '../src/services/notification.service.js';
import fcmService from '../src/services/fcm.service.js';
import logger from '../src/utility/logger.js';

async function testGlobalNotification() {
    try {
        console.log('--- Starting Global Notification Test ---');
        
        // 1. Connect to DB
        await connectDB();
        console.log('Connected to MongoDB');

        // 2. Initialize FCM
        fcmService.initialize();
        if (!fcmService.isEnabled) {
            console.error('FCM is not enabled! Check your .env FCM_SERVICE_ACCOUNT');
            process.exit(1);
        }
        console.log('FCM Service Initialized');

        // 3. Send Global Notification
        console.log('Sending global notification...');
        const result = await notificationService.sendNotification({
            userId: null, // Global
            title: 'Test Global Notification 🚀',
            body: 'Bhai, agar ye aapko dikh raha hai toh system work kar raha hai!',
            type: 'system',
            metadata: {
                test: 'true',
                timestamp: new Date().toISOString()
            }
        });

        console.log('--- Test Finished ---');
        console.log('DB Record Created:', result._id);
        console.log('Notification Title:', result.title);
        console.log('Global Status:', result.isGlobal);
        
        // Give it a second to finish FCM logging
        setTimeout(() => {
            mongoose.connection.close();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error('Test Failed:', error.message);
        process.exit(1);
    }
}

testGlobalNotification();
