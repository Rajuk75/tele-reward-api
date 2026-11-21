#!/usr/bin/env node
/**
 * seed_offers_100.js
 *
 * Seeds 100 campaigns + offers with exact payload structure requested.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Campaign from '../src/models/campaign.model.js';
import Offer from '../src/models/offer.model.js';
import User from '../src/models/user.model.js';
import config from '../src/config/config.js';

const CAMPAIGN_TEMPLATES = [
  { name: 'PhonePe', category: 'finance', type: 'app_install', payout: 40, userPayout: 30, description: 'Make UPI payments and recharge' },
  { name: 'Google Pay', category: 'finance', type: 'app_install', payout: 50, userPayout: 35, description: 'Simple and secure payments' },
  { name: 'Amazon India', category: 'shopping', type: 'app_install', payout: 45, userPayout: 32, description: 'Online shopping for everything' },
  { name: 'Spotify Music', category: 'entertainment', type: 'app_install', payout: 30, userPayout: 22, description: 'Music and podcasts' },
  { name: 'Zomato', category: 'food', type: 'app_install', payout: 40, userPayout: 28, description: 'Food delivery and discovery' },
  { name: 'Survey Junkie', category: 'business', type: 'survey', payout: 60, userPayout: 45, description: 'Earn by sharing your opinion' },
  { name: 'Toluna Influencers', category: 'business', type: 'survey', payout: 55, userPayout: 40, description: 'Influence your world' },
  { name: 'Ludo Supreme', category: 'gaming', type: 'quiz', payout: 35, userPayout: 25, description: 'Play ludo and win' },
  { name: 'Winzo Games', category: 'gaming', type: 'quiz', payout: 40, userPayout: 30, description: '100+ games in one app' },
  { name: 'Youtube Premium', category: 'entertainment', type: 'video', payout: 25, userPayout: 18, description: 'Ad-free video streaming' },
  { name: 'Netflix', category: 'entertainment', type: 'app_install', payout: 60, userPayout: 45, description: 'Movies and TV shows' },
  { name: 'Hotstar', category: 'entertainment', type: 'app_install', payout: 40, userPayout: 28, description: 'Live sports and movies' },
  { name: 'Uber', category: 'travel', type: 'app_install', payout: 45, userPayout: 32, description: 'Reliable rides' },
  { name: 'Ola', category: 'travel', type: 'app_install', payout: 40, userPayout: 30, description: 'Cabs, autos and more' },
  { name: 'Swagbucks', category: 'business', type: 'survey', payout: 70, userPayout: 52, description: 'The best reward site' },
  { name: 'Candy Crush', category: 'gaming', type: 'quiz', payout: 35, userPayout: 25, description: 'Sweetest puzzle game' },
  { name: 'CoinDCX', category: 'finance', type: 'app_install', payout: 70, userPayout: 50, description: 'Buy Bitcoin and crypto' },
  { name: 'Byjus', category: 'education', type: 'app_install', payout: 50, userPayout: 38, description: 'Learning app for kids' },
  { name: 'Myntra', category: 'shopping', type: 'app_install', payout: 55, userPayout: 40, description: 'Fashion and lifestyle' },
  { name: 'Flipkart', category: 'shopping', type: 'app_install', payout: 40, userPayout: 30, description: 'India\'s shopping app' },
  { name: 'CRED', category: 'finance', type: 'app_install', payout: 80, userPayout: 60, description: 'Manage credit cards' },
  { name: 'IndusInd Bank', category: 'finance', type: 'app_install', payout: 100, userPayout: 75, description: 'Online banking' },
  { name: 'Kotak 811', category: 'finance', type: 'app_install', payout: 120, userPayout: 90, description: 'Zero balance account' },
  { name: 'Meesho', category: 'shopping', type: 'app_install', payout: 30, userPayout: 22, description: 'Resell and earn' },
  { name: 'Snapdeal', category: 'shopping', type: 'app_install', payout: 35, userPayout: 25, description: 'Affordable shopping' },
  { name: 'Swiggy', category: 'food', type: 'app_install', payout: 40, userPayout: 28, description: 'Food delivery' },
  { name: 'Blinkit', category: 'food', type: 'app_install', payout: 35, userPayout: 25, description: '10 min delivery' },
  { name: 'BigBasket', category: 'food', type: 'app_install', payout: 45, userPayout: 32, description: 'Grocery shopping' },
  { name: 'Junglee Rummy', category: 'gaming', type: 'quiz', payout: 50, userPayout: 35, description: 'Skill based card game' },
  { name: 'Dream11', category: 'gaming', type: 'quiz', payout: 60, userPayout: 40, description: 'Fantasy sports' },
  { name: 'RummyCircle', category: 'gaming', type: 'quiz', payout: 55, userPayout: 38, description: 'Win real cash' },
  { name: 'OpinionWorld', category: 'business', type: 'survey', payout: 45, userPayout: 32, description: 'Paid surveys' },
  { name: 'LifePoints', category: 'business', type: 'survey', payout: 50, userPayout: 35, description: 'Community of survey takers' },
  { name: 'Panel Station', category: 'business', type: 'survey', payout: 40, userPayout: 30, description: 'Market research panel' },
  { name: 'Zee5', category: 'entertainment', type: 'video', payout: 20, userPayout: 15, description: 'Movies and originals' },
  { name: 'Alt Balaji', category: 'entertainment', type: 'video', payout: 22, userPayout: 16, description: 'Digital streaming' },
  { name: 'BookMyShow', category: 'entertainment', type: 'app_install', payout: 30, userPayout: 22, description: 'Tickets for movies/events' },
  { name: 'Ixigo', category: 'travel', type: 'app_install', payout: 40, userPayout: 28, description: 'Travel booking' },
  { name: 'MakeMyTrip', category: 'travel', type: 'app_install', payout: 50, userPayout: 35, description: 'Hotels and flights' },
  { name: 'Goibibo', category: 'travel', type: 'app_install', payout: 45, userPayout: 32, description: 'Book travel deals' },
  { name: 'LinkedIn', category: 'business', type: 'app_install', payout: 25, userPayout: 18, description: 'Professional network' },
  { name: 'Quikr', category: 'shopping', type: 'app_install', payout: 30, userPayout: 22, description: 'Buy and sell locally' },
  { name: 'Olx India', category: 'shopping', type: 'app_install', payout: 35, userPayout: 25, description: 'Used goods marketplace' },
  { name: 'Unacademy', category: 'education', type: 'app_install', payout: 40, userPayout: 30, description: 'Preparation for exams' },
  { name: 'Vedantu', category: 'education', type: 'app_install', payout: 45, userPayout: 32, description: 'Online tutoring' },
  { name: 'Tinder', category: 'entertainment', type: 'app_install', payout: 50, userPayout: 35, description: 'Dating and meeting' },
  { name: 'Bumble', category: 'entertainment', type: 'app_install', payout: 55, userPayout: 40, description: 'Date, meet, network' },
  { name: 'Shadi.com', category: 'entertainment', type: 'app_install', payout: 60, userPayout: 45, description: 'Matrimony service' },
  { name: 'JioCinema', category: 'entertainment', type: 'video', payout: 15, userPayout: 10, description: 'IPL and movies' },
  { name: 'MxPlayer', category: 'entertainment', type: 'video', payout: 18, userPayout: 12, description: 'Video player and OTT' },
  { name: 'Voot', category: 'entertainment', type: 'video', payout: 20, userPayout: 14, description: 'Reality shows' },
];

async function seedOne(data, userId, suffix = '') {
  const name = data.name + (suffix ? ` ${suffix}` : '');
  const { category, type, payout, userPayout, description } = data;
  const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&color=fff`;

  const campEvents = [
    { 
        name: 'install', 
        objective: type === 'survey' ? 'CPL' : 'CPI', 
        cap: 1000, 
        payout: Math.floor(payout * 0.4), 
        order: 1, 
        steps: 'Download the app' 
    },
    { 
        name: 'registration', 
        objective: 'CPA', 
        cap: 1000, 
        payout: Math.floor(payout * 0.6), 
        order: 2, 
        steps: 'Register account' 
    }
  ];

  // Exact payload structure matching user's provided JSON
  const campaign = await Campaign.create({
    name,
    imageUrl,
    previewUrl: imageUrl,
    description,
    campaignUrl: `https://track.adshamper.com/go?cid={click_id}&uid={user_id}&cam=${encodeURIComponent(name)}`,
    category,
    model: 'CPI',
    status: 'active',
    events: campEvents,
    conversionApproval: 'automatic',
    needApproval: false,
    sameClickIpBlock: true,
    sameConversionIpBlock: true,
    conversionDelayEnabled: false,
    conversionDelayMinutes: null,
    ipWhitelistEnabled: false,
    ipWhitelist: []
  });

  const offerEvents = [
    { eventName: 'install', payout: Math.floor(userPayout * 0.4), order: 1, steps: 'Download the app' },
    { eventName: 'registration', payout: Math.floor(userPayout * 0.6), order: 2, steps: 'Register account' }
  ];

  await Offer.create({
    campaignId: campaign._id,
    offerName: name,
    events: offerEvents,
    comment: 'Instant reward',
    termsAndConditions: 'Complete all steps correctly.',
    type: type,
    status: 'active',
    offerDisplay: true,
    isActive: true,
    totalCap: 1000,
    dailyCap: 100,
    completionsPerUser: 1,
    priority: Math.ceil(userPayout / 10),
  });
}

async function main() {
  console.log('🚀 Seeding 100+ Offers with exact payload structure...');
  await mongoose.connect(config.MONGO_URI);

  const adminUser = await User.findOne({});
  if (!adminUser) {
    console.error('❌ No user found in DB.');
    process.exit(1);
  }

  await Campaign.deleteMany({});
  await Offer.deleteMany({});

  for (let i = 0; i < 2; i++) {
    for (const data of CAMPAIGN_TEMPLATES) {
      await seedOne(data, adminUser._id, i === 0 ? '' : `V${i+1}`);
    }
  }

  console.log(`✅ Seeded: 102 items with exact payload`);
  await mongoose.disconnect();
  console.log('\n👋 Done!');
}

main().catch(console.error);
