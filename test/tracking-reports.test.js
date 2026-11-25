import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import express from 'express';
import clickRouter from '../src/modules/clicks/click.route.js';
import conversionRouter from '../src/modules/conversions/conversion.route.js';
import payoutRouter from '../src/modules/payouts/payout.route.js';
import { generateToken } from '../src/middleware/auth.middleware.js';
import Tracking from '../src/modules/tracking/tracking.model.js';
import Payout from '../src/modules/payouts/payout.model.js';
import User from '../src/modules/users/user.model.js';
import Campaign from '../src/modules/campaigns/campaign.model.js';
import Offer from '../src/modules/offers/offer.model.js';

test('admin tracking reports apply permissions, date filters and payout ledger units', {
    skip: !process.env.TRACKING_TEST_MONGO_URI,
}, async t => {
    // Use a new test database even when the supplied URI includes a database name.
    await mongoose.connect(process.env.TRACKING_TEST_MONGO_URI, { dbName: 'report_test_' + randomUUID() });
    t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
    const app = express();
    app.use(clickRouter, conversionRouter, payoutRouter);
    const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}/v1/admin/`;
    const [admin, user] = await User.create([
        { name: 'Admin', email: 'admin@example.test', userType: 'admin', password: 'fixture' },
        { name: 'Recipient', email: 'user@example.test', userType: 'user', password: 'fixture' },
    ]);
    const token = generateToken({ id: admin.id });
    const get = (path, auth = token) => fetch(origin + path, { headers: auth ? { Authorization: 'Bearer ' + auth } : {} });
    for (const tab of ['clicks', 'conversions', 'payouts']) {
        assert.equal((await get(tab, '')).status, 401);
        assert.equal((await get(tab, generateToken({ id: user.id }))).status, 403);
    }
    const campaign = await Campaign.create({ name: 'Campaign', imageUrl: 'logo', campaignUrl: 'https://example.test' });
    const offer = await Offer.create({ campaignId: campaign._id, offerName: 'Offer' });
    const base = { campaignId: campaign._id, offerId: offer._id, clickedAt: new Date('2025-01-01T13:00:00Z'), payoutAccount: 'test@upi' };
    await Tracking.create({ ...base, clickId: 'click-only' });
    const settled = await Tracking.create({ ...base, clickId: 'a.b', userId: user._id, status: 'partially_completed', postbackReceived: true,
        earnedUserAmountPaise: 1250, completedEvents: [{ order: 1, eventName: 'Install', amountAwarded: 1250, completedAt: new Date('2025-01-02T23:59:59Z') }] });
    for (const [status, type, amount] of [['unpaid','offer_completion',1250], ['paid','offer_referral',250]]) {
        await Payout.create({ trackingId: settled._id, offerId: offer._id, eventName: 'install', clickId: 'a.b', type, amount, status,
            payoutAccount: type === 'offer_referral' ? 'referrer@upi' : 'test@upi' });
    }
    async function data(path) {
        const res = await get(path);
        assert.equal(res.status, 200);
        return (await res.json()).data;
    }
    const clicks = await data('clicks?limit=1&startDate=2025-01-01&endDate=2025-01-01');
    assert.equal(clicks.pagination.total, 2); assert.equal(clicks.clicks.length, 1);
    const conversions = await data(`conversions?startDate=2025-01-02&endDate=2025-01-02&campaignId=${campaign.id}&userId=${user.id}`);
    assert.equal(conversions.pagination.total, 1); assert.equal(conversions.conversions[0].clickId, 'a.b');
    assert.equal(conversions.conversions[0].campaignId.name, 'Campaign');
    assert.equal((await data('conversions?endDate=2025-01-01')).pagination.total, 0);
    assert.equal((await data('clicks?search=.')).pagination.total, 1);
    assert.equal((await data('conversions?status=clicked')).pagination.total, 0);
    assert.equal((await get('clicks?limit=-1')).status, 400);
    assert.equal((await get('conversions?startDate=not-a-date')).status, 400);
    const payouts = await data('payouts');
    assert.equal(payouts.pagination.total, 2);
    assert.equal(payouts.summary.find(group => group._id === 'unpaid').amountPaise, 1250);
    assert.equal(payouts.summary.find(group => group._id === 'paid').amountPaise, 250);
    const paid = await data('payouts?status=paid&type=offer_referral&search=referrer');
    assert.equal(paid.payouts[0].payoutAccount, 'referrer@upi'); assert.equal(paid.pagination.total, 1);
});
