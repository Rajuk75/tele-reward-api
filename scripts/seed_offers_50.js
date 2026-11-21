#!/usr/bin/env node
/**
 * seed_offers_50.js
 *
 * Seeds 50+ campaigns + offers with mixed types into MongoDB.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Campaign from '../src/models/campaign.model.js';
import Offer from '../src/models/offer.model.js';
import User from '../src/models/user.model.js';
import config from '../src/config/config.js';

const CAMPAIGN_TEMPLATES = [
  { name: 'PhonePe', category: 'finance', type: 'app_install', payout: 40, userPayout: 30, steps: 'Install,Register,Link Bank Account', description: 'Make UPI payments and recharge' },
  { name: 'Google Pay', category: 'finance', type: 'app_install', payout: 50, userPayout: 35, steps: 'Install,Register,First Transaction', description: 'Simple and secure payments' },
  { name: 'Amazon India', category: 'shopping', type: 'app_install', payout: 45, userPayout: 32, steps: 'Install,Login,Add to cart', description: 'Online shopping for everything' },
  { name: 'Spotify Music', category: 'entertainment', type: 'app_install', payout: 30, userPayout: 22, steps: 'Install,Sign up,Play 3 songs', description: 'Music and podcasts' },
  { name: 'Zomato', category: 'food', type: 'app_install', payout: 40, userPayout: 28, steps: 'Install,Register,Browse Restaurants', description: 'Food delivery and discovery' },
  { name: 'Survey Junkie', category: 'business', type: 'survey', payout: 60, userPayout: 45, steps: 'Register,Complete Profile,Take 1 Survey', description: 'Earn by sharing your opinion' },
  { name: 'Toluna Influencers', category: 'business', type: 'survey', payout: 55, userPayout: 40, steps: 'Sign up,Verify Email,Answer 3 Polls', description: 'Influence your world' },
  { name: 'Ludo Supreme', category: 'gaming', type: 'quiz', payout: 35, userPayout: 25, steps: 'Install,Play 2 Matches', description: 'Play ludo and win' },
  { name: 'Winzo Games', category: 'gaming', type: 'quiz', payout: 40, userPayout: 30, steps: 'Install,Register,Play 5 Games', description: '100+ games in one app' },
  { name: 'Youtube Premium', category: 'entertainment', type: 'video', payout: 25, userPayout: 18, steps: 'Watch 3 ads,Sign up for trial', description: 'Ad-free video streaming' },
  { name: 'Netflix', category: 'entertainment', type: 'app_install', payout: 60, userPayout: 45, steps: 'Install,Register,Choose Plan', description: 'Movies and TV shows' },
  { name: 'Hotstar', category: 'entertainment', type: 'app_install', payout: 40, userPayout: 28, steps: 'Install,Sign up,Watch a clip', description: 'Live sports and movies' },
  { name: 'Uber', category: 'travel', type: 'app_install', payout: 45, userPayout: 32, steps: 'Install,Register,Book first ride', description: 'Reliable rides' },
  { name: 'Ola', category: 'travel', type: 'app_install', payout: 40, userPayout: 30, steps: 'Install,Register,Verify Number', description: 'Cabs, autos and more' },
  { name: 'Swagbucks', category: 'business', type: 'survey', payout: 70, userPayout: 52, steps: 'Register,Verify,Earn 100 SB', description: 'The best reward site' },
  { name: 'Candy Crush', category: 'gaming', type: 'quiz', payout: 35, userPayout: 25, steps: 'Install,Play 5 levels', description: 'Sweetest puzzle game' },
  { name: 'CoinDCX', category: 'finance', type: 'app_install', payout: 70, userPayout: 50, steps: 'Install,Register,Complete KYC', description: 'Buy Bitcoin and crypto' },
  { name: 'Byjus', category: 'education', type: 'app_install', payout: 50, userPayout: 38, steps: 'Install,Register,Attend trial class', description: 'Learning app for kids' },
  { name: 'Myntra', category: 'shopping', type: 'app_install', payout: 55, userPayout: 40, steps: 'Install,Login,Add wishlist', description: 'Fashion and lifestyle' },
  { name: 'Flipkart', category: 'shopping', type: 'app_install', payout: 40, userPayout: 30, steps: 'Install,Login,Explore deals', description: 'India\'s shopping app' },
  { name: 'CRED', category: 'finance', type: 'app_install', payout: 80, userPayout: 60, steps: 'Install,Register,Check Score', description: 'Manage credit cards' },
  { name: 'IndusInd Bank', category: 'finance', type: 'app_install', payout: 100, userPayout: 75, steps: 'Install,Apply,Digital Acc', description: 'Online banking' },
  { name: 'Kotak 811', category: 'finance', type: 'app_install', payout: 120, userPayout: 90, steps: 'Install,Register,Full KYC', description: 'Zero balance account' },
  { name: 'Meesho', category: 'shopping', type: 'app_install', payout: 30, userPayout: 22, steps: 'Install,Order first item', description: 'Resell and earn' },
  { name: 'Snapdeal', category: 'shopping', type: 'app_install', payout: 35, userPayout: 25, steps: 'Install,Browse Deals', description: 'Affordable shopping' },
  { name: 'Swiggy', category: 'food', type: 'app_install', payout: 40, userPayout: 28, steps: 'Install,Register,Order Food', description: 'Food delivery' },
  { name: 'Blinkit', category: 'food', type: 'app_install', payout: 35, userPayout: 25, steps: 'Install,Order Groceries', description: '10 min delivery' },
  { name: 'BigBasket', category: 'food', type: 'app_install', payout: 45, userPayout: 32, steps: 'Install,Sign up', description: 'Grocery shopping' },
  { name: 'Junglee Rummy', category: 'gaming', type: 'quiz', payout: 50, userPayout: 35, steps: 'Install,Play 1 match', description: 'Skill based card game' },
  { name: 'Dream11', category: 'gaming', type: 'quiz', payout: 60, userPayout: 40, steps: 'Install,Register,Join contest', description: 'Fantasy sports' },
  { name: 'RummyCircle', category: 'gaming', type: 'quiz', payout: 55, userPayout: 38, steps: 'Install,Register,Play', description: 'Win real cash' },
  { name: 'OpinionWorld', category: 'business', type: 'survey', payout: 45, userPayout: 32, steps: 'Register,Complete Survey', description: 'Paid surveys' },
  { name: 'LifePoints', category: 'business', type: 'survey', payout: 50, userPayout: 35, steps: 'Join,Verify,Start earning', description: 'Community of survey takers' },
  { name: 'Panel Station', category: 'business', type: 'survey', payout: 40, userPayout: 30, steps: 'Register,First Survey', description: 'Market research panel' },
  { name: 'Zee5', category: 'entertainment', type: 'video', payout: 20, userPayout: 15, steps: 'Watch 5 min video', description: 'Movies and originals' },
  { name: 'Alt Balaji', category: 'entertainment', type: 'video', payout: 22, userPayout: 16, steps: 'Watch a series clip', description: 'Digital streaming' },
  { name: 'BookMyShow', category: 'entertainment', type: 'app_install', payout: 30, userPayout: 22, steps: 'Install,Register,Browse', description: 'Tickets for movies/events' },
  { name: 'Ixigo', category: 'travel', type: 'app_install', payout: 40, userPayout: 28, steps: 'Install,Search Flight', description: 'Travel booking' },
  { name: 'MakeMyTrip', category: 'travel', type: 'app_install', payout: 50, userPayout: 35, steps: 'Install,Register', description: 'Hotels and flights' },
  { name: 'Goibibo', category: 'travel', type: 'app_install', payout: 45, userPayout: 32, steps: 'Install,Sign up', description: 'Book travel deals' },
  { name: 'LinkedIn', category: 'business', type: 'app_install', payout: 25, userPayout: 18, steps: 'Install,Register,Profile', description: 'Professional network' },
  { name: 'Quikr', category: 'shopping', type: 'app_install', payout: 30, userPayout: 22, steps: 'Install,Post an ad', description: 'Buy and sell locally' },
  { name: 'Olx India', category: 'shopping', type: 'app_install', payout: 35, userPayout: 25, steps: 'Install,Browse', description: 'Used goods marketplace' },
  { name: 'Unacademy', category: 'education', type: 'app_install', payout: 40, userPayout: 30, steps: 'Install,Register', description: 'Preparation for exams' },
  { name: 'Vedantu', category: 'education', type: 'app_install', payout: 45, userPayout: 32, steps: 'Install,Watch trial', description: 'Online tutoring' },
  { name: 'Tinder', category: 'entertainment', type: 'app_install', payout: 50, userPayout: 35, steps: 'Install,Register,Profile', description: 'Dating and meeting' },
  { name: 'Bumble', category: 'entertainment', type: 'app_install', payout: 55, userPayout: 40, steps: 'Install,Register', description: 'Date, meet, network' },
  { name: 'Shadi.com', category: 'entertainment', type: 'app_install', payout: 60, userPayout: 45, steps: 'Install,Sign up', description: 'Matrimony service' },
  { name: 'JioCinema', category: 'entertainment', type: 'video', payout: 15, userPayout: 10, steps: 'Watch a movie', description: 'IPL and movies' },
  { name: 'MxPlayer', category: 'entertainment', type: 'video', payout: 18, userPayout: 12, steps: 'Watch any video', description: 'Video player and OTT' },
  { name: 'Voot', category: 'entertainment', type: 'video', payout: 20, userPayout: 14, steps: 'Sign up for free', description: 'Reality shows' },
];

async function seedOne(data, userId) {
  const { name, category, type, payout, userPayout, steps, description } = data;
  const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&color=fff`;

  const campaign = await Campaign.create({
    name,
    imageUrl,
    previewUrl: imageUrl,
    description,
    campaignUrl: `https://track.adshamper.com/click?cid={click_id}&uid={user_id}&campaign=${encodeURIComponent(name)}&src={source}`,
    category,
    model: type === 'survey' ? 'CPL' : 'CPI',
    status: 'active',
    featured: Math.random() > 0.8, // 20% chance to be featured
    events: [{ name: 'Task', objective: type === 'survey' ? 'CPL' : 'CPI', cap: 1000, payout: payout, order: 1 }],
    conversionApproval: 'automatic',
    needApproval: false,
  });

  await Offer.create({
    campaignId: campaign._id,
    offerName: name,
    events: [{ eventName: 'Task', payout: userPayout, order: 1 }],
    steps: steps,
    comment: `Complete ${name} task to earn ₹${userPayout}`,
    termsAndConditions: `Complete steps correctly. One reward per user.`,
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
  console.log(`🚀 Seeding ${CAMPAIGN_TEMPLATES.length} Diverse Offers...`);
  await mongoose.connect(config.MONGO_URI);

  const adminUser = await User.findOne({});
  if (!adminUser) {
    console.error('❌ No user found in DB.');
    process.exit(1);
  }

  // Clear existing to ensure a fresh set for testing
  await Campaign.deleteMany({});
  await Offer.deleteMany({});

  for (const data of CAMPAIGN_TEMPLATES) {
    await seedOne(data, adminUser._id);
    console.log(`✅ Seeded: ${data.name} (${data.type})`);
  }

  await mongoose.disconnect();
  console.log('\n👋 Done! Total offers seeded: ' + CAMPAIGN_TEMPLATES.length);
}

main().catch(console.error);
