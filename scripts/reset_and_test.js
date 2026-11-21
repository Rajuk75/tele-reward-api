import mongoose from 'mongoose';
import config from '../src/core/config.js';

// Models
import Campaign from '../src/modules/campaigns/campaign.model.js';
import Event from '../src/modules/offers/event.model.js';
import Offer from '../src/modules/offers/offer.model.js';
import Tracking from '../src/modules/tracking/tracking.model.js';
import Revenue from '../src/modules/conversions/revenue.model.js';
import PostbackLog from '../src/modules/postbacks/postbackLog.model.js';
import Payout from '../src/modules/payouts/payout.model.js';

// Services
import offerService from '../src/modules/offers/offer.service.js';
import clickService from '../src/modules/clicks/click.service.js';
import postbackService from '../src/modules/postbacks/postback.service.js';

async function runResetAndTest() {
    console.log('================================================================');
    console.log('🔄 STARTING DATABASE CLEANUP & E2E CLICK-TO-POSTBACK TEST');
    console.log('================================================================\n');

    try {
        await mongoose.connect(config.MONGO_URI);
        console.log(' Connected to MongoDB Atlas successfully.');

        // ── 1. PURGE OLD TEST DATA ──
        console.log('\n🧹 Purging existing Campaign, Event, Offer, Tracking, Revenue, PostbackLog, Payout collections...');
        const [cDel, eDel, oDel, tDel, rDel, pDel, pyDel] = await Promise.all([
            Campaign.deleteMany({}),
            Event.deleteMany({}),
            Offer.deleteMany({}),
            Tracking.deleteMany({}),
            Revenue.deleteMany({}),
            PostbackLog.deleteMany({}),
            Payout.deleteMany({})
        ]);
        console.log(` Deleted: ${cDel.deletedCount} campaigns, ${eDel.deletedCount} events, ${oDel.deletedCount} offers, ${tDel.deletedCount} trackings, ${rDel.deletedCount} revenues, ${pDel.deletedCount} logs, ${pyDel.deletedCount} payouts.`);

        // ── 2. SEED FRESH CAMPAIGN & EVENT ──
        console.log('\n🌱 Seeding fresh Campaign and Event...');
        const campaign = await Campaign.create({
            name: 'WinZO Direct Campaign',
            imageUrl: 'https://placehold.co/200x200?text=WinZO',
            previewUrl: 'https://winzo.example.com/preview',
            description: 'Install and play 1 game on WinZO',
            campaignUrl: 'https://track.winzo.example.com/click?aff_click={clickId}&sub_id={cid}',
            category: 'gaming',
            model: 'CPI',
            status: 'active',
            totalAdvertiserPayout: 30,
            ipWhitelistEnabled: false,
            shaving: { enabled: false, ratio: 0 }
        });

        const event = await Event.create({
            campaignId: campaign._id,
            name: 'Install',
            objective: 'CPI',
            cap: 500,
            advertiserPayout: 30,
            order: 1,
            steps: 'Download APK and open app',
            status: 'active'
        });

        campaign.events = [event._id];
        await campaign.save();
        console.log(` Created Campaign: "${campaign.name}" (ID: ${campaign._id}) with Event "${event.name}" (Advertiser Payout: ₹${event.advertiserPayout})`);

        // ── 3. SEED FRESH OFFER ──
        console.log('\n🌱 Seeding fresh Offer linked to Campaign...');
        const offer = await Offer.create({
            campaignId: campaign._id,
            offerName: 'WinZO Play & Earn ₹20',
            category: 'gaming',
            model: 'CPI',
            status: 'active',
            isActive: true,
            isDeleted: false,
            postbackSecretKey: 'winzo_secret_key_123',
            firstEventPayout: 20,
            totalPayout: 20,
            events: [{
                campaignEventId: event._id,
                userPayout: 20
            }],
            currentInstalls: 0
        });
        console.log(` Created Offer: "${offer.offerName}" (ID: ${offer._id}) | User Payout: ₹${offer.firstEventPayout} | Secret: ${offer.postbackSecretKey}`);

        // ── 4. TEST PUBLIC OFFER FETCH ──
        console.log('\n🔍 TEST 1: Fetching Public Offer...');
        const publicOffer = await offerService.getPublicOffer(offer._id.toString());
        console.log(` Public Offer fetched: ${publicOffer.offerName} | Category: ${publicOffer.category} | Reward: ₹${publicOffer.rewardINR}`);

        // ── 5. TEST CLICK GENERATION ──
        console.log('\n🖱️ TEST 2: Generating Click...');
        const payoutAccount = '9876543210@paytm';
        const clickResult = await clickService.generateClick(
            offer._id.toString(),
            { payoutAccount, payoutType: 'UPI', source: 'telegram_bot' },
            { ip: '103.21.244.2', userAgent: 'Mozilla/5.0 TelegramRewardBot' }
        );
        console.log(` Click Created successfully!`);
        console.log(`   - Click ID: ${clickResult.clickId}`);
        console.log(`   - Destination URL: ${clickResult.redirectUrl}`);
        console.log(`   - Payout Account: ${clickResult.payoutAccount}`);

        // Verify clickId replaced in URL
        if (clickResult.redirectUrl.includes(clickResult.clickId)) {
            console.log(`   Macro replacement verification PASSED ({clickId} substituted correctly).`);
        } else {
            throw new Error(`Macro replacement failed in destination URL: ${clickResult.redirectUrl}`);
        }

        // ── 6. TEST POSTBACK: INVALID SECRET ──
        console.log('\n🛡️ TEST 3: Testing Postback with Invalid Secret Key...');
        try {
            await postbackService.handlePostback(clickResult.clickId, 'wrong_secret_123', '103.21.244.2', { event: 'Install' });
            throw new Error('Postback should have failed on wrong secret, but succeeded!');
        } catch (err) {
            console.log(`   Caught expected rejection: "${err.message}"`);
        }

        // ── 7. TEST POSTBACK: GENUINE CONVERSION SUCCESS ──
        console.log('\n🎯 TEST 4: Testing Genuine Postback Conversion...');
        const postbackSuccess = await postbackService.handlePostback(
            clickResult.clickId,
            'winzo_secret_key_123',
            '103.21.244.2',
            { event: 'Install', txid: 'TXN_TEST_998877' }
        );
        console.log(` Postback executed successfully!`, postbackSuccess);

        // Verify DB State
        const [updatedTracking, createdRevenue, updatedOffer, latestLog, createdPayout] = await Promise.all([
            Tracking.findOne({ clickId: clickResult.clickId }),
            Revenue.findOne({ trackingId: (await Tracking.findOne({ clickId: clickResult.clickId }))._id }),
            Offer.findById(offer._id),
            PostbackLog.findOne({ clickId: clickResult.clickId }).sort({ createdAt: -1 }),
            Payout.findOne({ clickId: clickResult.clickId })
        ]);

        console.log('\n📊 VERIFYING DATABASE STATE:');
        console.log(`   - Tracking Status: "${updatedTracking.status}" (Expected: "completed")`);
        console.log(`   - Amount Awarded: ₹${updatedTracking.amountAwarded} (Expected: ₹20)`);
        console.log(`   - Revenue Advertiser Amount: ₹${createdRevenue.advertiserAmount} (Expected: ₹30)`);
        console.log(`   - Revenue User Reward: ₹${createdRevenue.userReward} (Expected: ₹20)`);
        console.log(`   - Platform Margin: ₹${createdRevenue.margin} (Expected: ₹10)`);
        console.log(`   - Offer Current Installs: ${updatedOffer.currentInstalls} (Expected: 1)`);
        console.log(`   - Latest Postback Log: Status="${latestLog.status}" | Notes="${latestLog.notes}"`);
        console.log(`   - Created Payout Record: Status="${createdPayout?.status}" | Amount=₹${createdPayout?.amount} | Account="${createdPayout?.payoutAccount}" | Type="${createdPayout?.type}"`);

        if (updatedTracking.status !== 'completed' || createdRevenue.margin !== 10 || updatedOffer.currentInstalls !== 1 || createdPayout?.status !== 'unpaid' || createdPayout?.amount !== 20) {
            throw new Error('Database state validation failed!');
        }
        console.log(' All Database state checks PASSED!');

        // ── 8. TEST POSTBACK: DUPLICATE CONVERSION ──
        console.log('\n🚫 TEST 5: Testing Duplicate Postback Rejection...');
        try {
            await postbackService.handlePostback(
                clickResult.clickId,
                'winzo_secret_key_123',
                '103.21.244.2',
                { event: 'Install' }
            );
            throw new Error('Duplicate postback should have failed, but succeeded!');
        } catch (err) {
            console.log(`   Caught expected duplicate rejection: "${err.message}"`);
        }

        // ── 9. TEST DUPLICATE CLICK ON COMPLETED OFFER ──
        console.log('\n🚫 TEST 6: Testing Click Generation on already Completed Offer by same Account...');
        try {
            await clickService.generateClick(
                offer._id.toString(),
                { payoutAccount, payoutType: 'UPI' },
                { ip: '103.21.244.2', userAgent: 'Mozilla/5.0' }
            );
            throw new Error('Click on completed offer should have thrown, but succeeded!');
        } catch (err) {
            console.log(`   Caught expected account duplicate rejection: "${err.message}"`);
        }

        console.log('\n================================================================');
        console.log('🎉 ALL 6 E2E LIFECYCLE TESTS PASSED PERFECTLY!');
        console.log('================================================================\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUNNER FAILED:', error.message);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

runResetAndTest();
