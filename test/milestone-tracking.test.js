import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import campaignService from '../src/modules/campaigns/campaign.service.js';
import offerService from '../src/modules/offers/offer.service.js';
import clickService from '../src/modules/clicks/click.service.js';
import postbacks from '../src/modules/postbacks/postback.service.js';
import Offer from '../src/modules/offers/offer.model.js';
import OfferEvent from '../src/modules/offers/offerEvent.model.js';
import OfferReferral from '../src/modules/referrals/offerReferral.model.js';
import Tracking from '../src/modules/tracking/tracking.model.js';
import Revenue from '../src/modules/conversions/revenue.model.js';
import publicService from '../src/modules/public/public.service.js';

test('direct and referral clicks settle milestones once, including concurrent callbacks', {
    skip: !process.env.TRACKING_TEST_MONGO_URI
}, async t => {
    await mongoose.connect(process.env.TRACKING_TEST_MONGO_URI, { dbName: 'tracking_test_' + randomUUID() });
    t.after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const campaign = await campaignService.createCampaign({
        campaign: { name: 'Tracking test', imageUrl: 'test.png', campaignUrl: 'https://example.test/?cid={clickId}' },
        events: ['install', 'register', 'deposit'].map(key => ({
            name: 'Display ' + key, eventKey: key, cap: 50, advertiserPayout: 50
        }))
    });
    const createWithEvents = events => offerService.createOffer({ offer: { campaignId: campaign._id }, events });
    const selection = { campaignEventId: campaign.events[0]._id, userPayout: 5 };
    await assert.rejects(createWithEvents([selection, selection]), /only once/);
    await assert.rejects(createWithEvents([{ ...selection, campaignEventId: new mongoose.Types.ObjectId() }]), /from this campaign/);
    const offer = await offerService.createOffer({ offer: { campaignId: campaign._id },
        events: campaign.events.map((e, i) => ({ campaignEventId: e._id, userPayout: [10, 20.01, 70][i] }))
    });
    const stored = await Offer.collection.findOne({ _id: offer._id });
    assert.ok(stored.campaignId.equals(campaign._id));
    assert.equal(stored.events, undefined);
    assert.equal(stored.firstEventPayout, undefined);
    assert.equal(stored.totalPayout, undefined);
    const listing = await offerService.getAllOffers();
    assert.equal(listing.offers[0].totalPayout, 100.01);
    const children = await OfferEvent.find({ offerId: stored._id });
    assert.deepEqual(children.map(row => String(row.campaignEventId)).sort(),
        campaign.events.map(event => String(event._id)).sort());
    const { postbackSecretKey } = await Offer.findById(offer._id).select('+postbackSecretKey');
    const referral = await OfferReferral.create({ offerId: offer._id, referralCode: 'team', referrerAccount: 'owner@bank' });
    await OfferReferral.create({ offerId: new mongoose.Types.ObjectId(), referralCode: 'other', referrerAccount: 'another@bank' });
    const click = (account, code) => clickService.generateClick(offer._id, { payoutAccount: account, referralCode: code });
    const report = (id, event) => postbacks.handlePostback(id, postbackSecretKey, '127.0.0.1', { goal: event });
    await assert.rejects(click('bad', 'other'), /invalid or inactive/);
    await assert.rejects(click('bad', 'missing'), /invalid or inactive/);
    const direct = await click('direct');
    assert.equal(direct.maxUserEarningPaise, 10001);
    const referred = await click('friend', ' TEAM ');
    const id = referred.clickId;
    assert.equal(referred.maxUserEarningPaise, 6001);
    assert.equal((await Tracking.findOne({ clickId: id })).status, 'clicked');
    await assert.rejects(report(id, undefined), /Missing or unknown/);
    await assert.rejects(report(id, 'misspelled'), /Missing or unknown/);
    await OfferReferral.updateOne({ _id: referral._id }, { $set: { status: 'paused', referrerPercent: 80 } });
    await assert.rejects(click('bad', 'team'), /invalid or inactive/);
    const replies = await Promise.all([report(id, 'REGISTER '), report(id, 'register')]);
    assert.equal(replies.filter(r => r.duplicate).length, 1);
    const publicOffer = await offerService.getPublicOffer(offer._id);
    assert.equal(publicOffer.totalRewardINR, 100.01);
    const partial = await Tracking.findOne({ clickId: id });
    assert.equal(partial.status, 'partially_completed');
    assert.equal(partial.earnedUserAmountPaise, 1201);
    assert.equal(partial.earnedReferrerAmountPaise, 800);
    await Promise.all([report(id, 'deposit'), report(id, 'install')]);
    assert.equal((await report(id, 'register')).duplicate, true);
    const final = await Tracking.findOne({ clickId: id });
    assert.equal(final.status, 'completed');
    assert.equal(final.earnedUserAmountPaise, 6001);
    assert.equal(final.earnedReferrerAmountPaise, 4000);
    assert.equal(await Revenue.countDocuments({ trackingId: final._id }), 3);
    const counters = await OfferReferral.findById(referral._id);
    assert.deepEqual([counters.totalClicks, counters.totalConversions, counters.totalEarnings], [1, 1, 40]);
    // A failure after updating Tracking rolls back the event and the counters.
    const injected = t.mock.method(Revenue, 'create', async () => { throw new Error('simulated write failure'); });
    await assert.rejects(report(direct.clickId, 'deposit'), /simulated write failure/);
    injected.mock.restore();
    assert.equal((await Tracking.findOne({ clickId: direct.clickId })).status, 'clicked');
    await report(direct.clickId, 'deposit');
    const [status] = await publicService.getPublicStatus(direct.clickId);
    assert.equal(status.rewardAmount, 70);
    assert.equal(status.status, 'Partially Completed');

    const singleCampaign = await campaignService.createCampaign({
        campaign: { name: 'Single', imageUrl: 'a.png', campaignUrl: 'https://example.test' },
        events: [{ name: 'Install', cap: 5, payout: 5 }]
    });
    const single = await offerService.createOffer({ offer: { campaignId: singleCampaign._id },
        events: [{ campaignEventId: singleCampaign.events[0]._id, userPayout: 2 }] });
    const singleClick = await clickService.generateClick(single._id, { payoutAccount: 'single' });
    const singleOffer = await Offer.findById(single._id).select('+postbackSecretKey');
    const accepted = await postbacks.handlePostback(singleClick.clickId, singleOffer.postbackSecretKey, '127.0.0.1', {});
    assert.equal(accepted.status, 'completed');
    assert.equal(accepted.amountAwarded, 2);
});
