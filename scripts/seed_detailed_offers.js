import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import config from '../src/core/config.js';
import { buildPostbackUrl } from '../src/core/urlBuilder.js';
import Campaign from '../src/modules/campaigns/campaign.model.js';
import CampaignEvent from '../src/modules/campaigns/campaignEvent.model.js';
import Offer from '../src/modules/offers/offer.model.js';
import OfferEvent from '../src/modules/offers/offerEvent.model.js';
import offerRepo from '../src/modules/offers/offer.repo.js';

const examples = [
    {
        key: 'pantry', brand: 'Pantry Basket', category: 'shopping', model: 'CPS', title: 'First grocery order',
        description: 'Build a grocery basket and track the first delivered order.',
        terms: 'Only the first delivered order qualifies. Cancelled or returned orders do not qualify.',
        events: [
            { key: 'install', name: 'Install and open', steps: 'Open the grocery app for the first time.', cap: 1200, advertiser: 10, user: 6 },
            { key: 'register', name: 'Create an account', steps: 'Finish registration and reach the home screen.', cap: 800, advertiser: 20, user: 12 },
            { key: 'order_delivered', name: 'Receive first order', steps: 'Place a grocery order and wait until its status is Delivered.', cap: 300, advertiser: 85, user: 55, proof: 'Show the Delivered status and order number. Hide the delivery address.' },
        ],
    },
    {
        key: 'lesson', brand: 'Lesson Lane', category: 'education', model: 'CPA', title: 'Complete a starter lesson',
        description: 'Try a beginner course and complete its first practice quiz.',
        terms: 'Complete the lesson and quiz using the same learner account. Repeat attempts qualify once.',
        events: [
            { key: 'enroll', name: 'Enroll in a course', steps: 'Choose a beginner course and confirm enrollment.', cap: 600, advertiser: 18, user: 10 },
            { key: 'pass_quiz', name: 'Pass the practice quiz', steps: 'Finish lesson one and score at least 70% on the practice quiz.', cap: 350, advertiser: 50, user: 34, proof: 'Show the quiz result with the course title and score visible.' },
        ],
    },
    {
        key: 'planner', brand: 'Week Planner', category: 'productivity', model: 'CPA', title: 'Plan your first week',
        description: 'Create a workspace, schedule three tasks and complete the first one.',
        terms: 'All tasks must belong to one new workspace. Duplicate workspaces do not earn additional credit.',
        events: [
            { key: 'workspace', name: 'Create workspace', steps: 'Create a workspace and choose the weekly planning view.', cap: 900, advertiser: 14, user: 8 },
            { key: 'schedule', name: 'Schedule three tasks', steps: 'Add three tasks with due dates for this week.', cap: 500, advertiser: 25, user: 15 },
            { key: 'complete', name: 'Complete first task', steps: 'Mark a scheduled task as complete in the weekly view.', cap: 450, advertiser: 30, user: 20 },
        ],
    },
];

function documents(example) {
    const { key, brand, category, model, title, description, terms, events } = example;
    const manual = events.some(event => event.proof);
    const campaign = new Campaign({
        uniqueId: `telegram-demo-v1-${key}`, name: `${brand} (Demo)`, description, category, model,
        imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(brand)}&background=334155&color=fff`,
        campaignUrl: `https://example.com/${key}?click_id={click_id}`, status: 'inactive',
        conversionApproval: manual ? 'manual' : 'automatic', needApproval: manual,
    });
    const secret = randomUUID();
    const offer = new Offer({
        campaignId: campaign._id, category, model, offerName: `${brand} · ${title} (Demo)`,
        type: key === 'pantry' ? 'app_install' : 'task', comment: description,
        steps: events.map((e, i) => `${i + 1}. ${e.steps}`).join('\n'), termsAndConditions: terms,
        referTermsAndConditions: 'Referral credit applies once per eligible new participant.',
        status: 'paused', isActive: false, offerDisplay: false, oneUpiOneTime: true,
        spinSettings: { enabled: key === 'lesson', slices: [2, 5, 8, 10] },
        postbackSecretKey: secret, postbackUrl: buildPostbackUrl(secret),
    });
    const milestones = events.map((e, index) => new CampaignEvent({
        campaignId: campaign._id, eventKey: e.key, name: e.name, order: index + 1, steps: e.steps, cap: e.cap,
        advertiserPayout: e.advertiser, proofRequired: !!e.proof, proofInstructions: e.proof || '',
        proofs: e.proof ? [{ label: 'Completion screenshot', type: 'image', isRequired: true }] : [],
    }));
    const links = milestones.map((event, i) => new OfferEvent({
        offerId: offer._id, campaignEventId: event._id, userPayout: events[i].user,
    }));
    return { campaign, offer, milestones, links };
}

async function run() {
    const checkOnly = process.argv.includes('--check');
    if (!checkOnly) await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    for (const example of examples) {
        const { campaign, offer, milestones, links } = documents(example);
        const records = [campaign, offer, ...milestones, ...links];
        await Promise.all(records.map(doc => doc.validate()));
        if (checkOnly) {
            console.log(`Validated ${offer.offerName}: ${links.length} linked events`);
            continue;
        }

        const result = await mongoose.connection.transaction(async session => {
            const existing = await Campaign.findOne({ uniqueId: campaign.uniqueId }).session(session);
            if (existing) {
                const linked = await Offer.findOne({ campaignId: existing._id }).session(session);
                if (!linked) throw new Error(`Seed campaign has no linked offer: ${campaign.name}`);
                return { id: linked._id, action: 'Existing' };
            }
            for (const doc of records) await doc.save({ session });
            return { id: offer._id, action: 'Created' };
        });
        const saved = await offerRepo.findOfferById(result.id);
        if (!saved?.events?.length || saved.events.some(row => !row.campaignEventId?._id)) {
            throw new Error(`Cannot verify linked events for ${offer.offerName}`);
        }
        const total = saved.events.reduce((sum, row) => sum + row.userPayout, 0);
        console.log(`${result.action}: ${saved.offerName} | ${saved.events.length} events | INR ${total} total user payout`);
    }
}

try {
    await run();
} catch (error) {
    console.error('Seed failed:', error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[database URI]'));
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
