#!/usr/bin/env node
/**
 * seed_campaigns.js
 *
 * Seeds 105 campaigns + 1 offer each into MongoDB.
 * Each campaign gets a real 100×100 image downloaded from Picsum Photos
 * and uploaded to S3, with a matching Upload record in the DB.
 *
 * Usage (run from Reward_api/ directory):
 *   node scripts/seed_campaigns.js
 *
 * Options (env vars):
 *   SKIP_IMAGES=true   → skip S3 uploads, use placeholder URL (faster for dev)
 *   BATCH_SIZE=10      → how many to insert concurrently (default 5)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { uploadToS3 } from '../src/utility/s3.utility.js';
import Campaign from '../src/models/campaign.model.js';
import Offer from '../src/models/offer.model.js';
import Upload from '../src/models/upload.model.js';
import User from '../src/models/user.model.js';
import config from '../src/config/config.js';

// ── Config ────────────────────────────────────────────────────────────────────

const SKIP_IMAGES = process.env.SKIP_IMAGES === 'true';
const BATCH_SIZE  = parseInt(process.env.BATCH_SIZE || '5', 10);

// ── Campaign Data ─────────────────────────────────────────────────────────────
// 105 entries spread across all 13 categories.
// Each entry: { name, category, model, payout, userPayout, type, steps, comment, description }
// type → maps to Flutter filter: 'app_install' | 'quiz' | 'survey' | 'video'

const CAMPAIGNS = [
  // ── GAMING (10) — Flutter type: quiz ─────────────────────────────────────
  { name: 'Ludo King',         category: 'gaming',        model: 'CPI', payout: 30,  userPayout: 22,  steps: 'Install,Open app,Play 1 game', comment: 'Install Ludo King and play 1 complete game to earn ₹22',  description: 'Classic ludo board game with millions of players' },
  { name: 'MPL Pro Games',     category: 'gaming',        model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Register,Play match', comment: 'Install MPL Pro and play your first match to earn ₹38', description: 'Win real cash playing skill-based games' },
  { name: 'Dream11',           category: 'gaming',        model: 'CPI', payout: 80,  userPayout: 60,  steps: 'Install,Sign up,Join contest', comment: 'Install Dream11, create account and join a contest', description: 'Fantasy cricket & sports platform' },
  { name: 'WinZO Gold',        category: 'gaming',        model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Register,Play 5 games', comment: 'Install WinZO and play 5 games to claim ₹45', description: '100+ games — earn real money by playing' },
  { name: 'Zupee Ludo',        category: 'gaming',        model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Create account,Play', comment: 'Install Zupee, create account and play one round', description: 'Earn cash playing Ludo & card games' },
  { name: 'Hago Games',        category: 'gaming',        model: 'CPD', payout: 25,  userPayout: 18,  steps: 'Install,Login,Play 10 min', comment: 'Play Hago Games for 10 minutes to earn ₹18', description: 'Social party games with friends' },
  { name: 'RummyCircle',       category: 'gaming',        model: 'CPI', payout: 70,  userPayout: 52,  steps: 'Install,Register,Add cash', comment: 'Install RummyCircle, register and add ₹10 to earn ₹52', description: 'India\'s largest online rummy platform' },
  { name: 'Teen Patti Stars',  category: 'gaming',        model: 'CPI', payout: 40,  userPayout: 30,  steps: 'Install,Create account,Play', comment: 'Install Teen Patti Stars and play 5 rounds', description: 'Play teen patti online and win real cash' },
  { name: 'Pokerbaazi',        category: 'gaming',        model: 'CPI', payout: 90,  userPayout: 68,  steps: 'Install,Register,Verify', comment: 'Install Pokerbaazi and verify your account to earn ₹68', description: 'India\'s premier online poker platform' },
  { name: 'My11Circle',        category: 'gaming',        model: 'CPI', payout: 75,  userPayout: 56,  steps: 'Install,Sign up,Join team', comment: 'Install My11Circle and create your first team', description: 'Fantasy sports with celebrity backing' },

  // ── FINANCE (10) ─────────────────────────────────────────────────────────
  { name: 'Zerodha Kite',      category: 'finance',       model: 'CPA', payout: 150, userPayout: 110, steps: 'Install,Open account,Verify KYC', comment: 'Open a Zerodha account and complete KYC to earn ₹110', description: 'India\'s #1 stock broker — invest in stocks & MF' },
  { name: 'Groww Invest',      category: 'finance',       model: 'CPL', payout: 100, userPayout: 75,  steps: 'Install,Register,Invest ₹100', comment: 'Install Groww, register and make your first investment', description: 'Simple & free investment app for stocks and MF' },
  { name: 'Upstox Pro',        category: 'finance',       model: 'CPA', payout: 130, userPayout: 95,  steps: 'Install,Create account,KYC', comment: 'Open Upstox account and complete KYC to earn ₹95', description: 'Trade stocks & mutual funds on Upstox' },
  { name: 'Angel One',         category: 'finance',       model: 'CPA', payout: 140, userPayout: 105, steps: 'Install,Register,Complete KYC', comment: 'Open Angel One demat account with full KYC', description: 'Smart investing & full-service brokerage' },
  { name: 'Cred App',          category: 'finance',       model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Register,Add card', comment: 'Install CRED and add your credit card to earn ₹45', description: 'Pay credit card bills and earn rewards' },
  { name: 'Fi Money',          category: 'finance',       model: 'CPA', payout: 120, userPayout: 90,  steps: 'Install,Open account,Add money', comment: 'Open Fi account and add ₹100 to earn ₹90', description: 'Modern salary account with smart features' },
  { name: 'Jupiter Bank',      category: 'finance',       model: 'CPA', payout: 110, userPayout: 82,  steps: 'Install,Register,KYC,Fund', comment: 'Open Jupiter account, do KYC and fund your account', description: 'Zero-fee digital bank account with Visa card' },
  { name: 'Coin by Zerodha',   category: 'finance',       model: 'CPL', payout: 85,  userPayout: 64,  steps: 'Install,Register,Invest SIP', comment: 'Install Coin and set up a SIP investment', description: 'Invest in direct mutual funds at zero cost' },
  { name: 'Paytm Money',       category: 'finance',       model: 'CPL', payout: 90,  userPayout: 68,  steps: 'Install,Login,Invest ₹500', comment: 'Install Paytm Money and make your first investment', description: 'Invest in stocks, MF and NPS on Paytm' },
  { name: 'Navi Mutual Fund',  category: 'finance',       model: 'CPL', payout: 70,  userPayout: 52,  steps: 'Install,Create account,Invest', comment: 'Install Navi and invest ₹100 in any fund', description: 'Low-cost index funds by Sachin Tendulkar' },

  // ── LOAN (8) ─────────────────────────────────────────────────────────────
  { name: 'KreditBee',         category: 'loan',          model: 'CPL', payout: 120, userPayout: 90,  steps: 'Install,Register,Apply loan', comment: 'Apply for a personal loan on KreditBee to earn ₹90', description: 'Instant personal loans up to ₹3 lakhs' },
  { name: 'MoneyTap',          category: 'loan',          model: 'CPL', payout: 100, userPayout: 75,  steps: 'Install,Sign up,Check eligibility', comment: 'Install MoneyTap and check your loan eligibility', description: 'App-based credit line — borrow as you need' },
  { name: 'EarlySalary',       category: 'loan',          model: 'CPL', payout: 110, userPayout: 82,  steps: 'Install,Register,Apply', comment: 'Install EarlySalary and apply for a loan to earn ₹82', description: 'Instant salary advance loans in 8 minutes' },
  { name: 'CASHe',             category: 'loan',          model: 'CPL', payout: 95,  userPayout: 72,  steps: 'Install,KYC,Apply loan', comment: 'Install CASHe, complete KYC and apply for ₹72', description: 'Instant loans based on social profile score' },
  { name: 'Slice Card',        category: 'loan',          model: 'CPL', payout: 130, userPayout: 98,  steps: 'Install,Apply card,Activate', comment: 'Get a Slice card and activate it to earn ₹98', description: 'Super credit card for millennials' },
  { name: 'Lazypay',           category: 'loan',          model: 'CPL', payout: 85,  userPayout: 64,  steps: 'Install,Register,Use pay later', comment: 'Install LazyPay and use Pay Later once to earn ₹64', description: 'Buy now pay later — split EMI payments' },
  { name: 'PaySense Loan',     category: 'loan',          model: 'CPL', payout: 115, userPayout: 86,  steps: 'Install,Apply,Verify', comment: 'Apply for a loan on PaySense and verify identity', description: 'Personal loans with flexible repayment' },
  { name: 'Home Credit India', category: 'loan',          model: 'CPL', payout: 105, userPayout: 78,  steps: 'Install,Apply loan,Submit docs', comment: 'Apply for a Home Credit loan and submit documents', description: 'Quick loans for everyone — doorstep service' },

  // ── SHOPPING (8) ─────────────────────────────────────────────────────────
  { name: 'Meesho App',        category: 'shopping',      model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Register,Place order', comment: 'Install Meesho and place your first order to earn ₹34', description: 'Resell products and earn — India\'s #1 social commerce' },
  { name: 'Nykaa Fashion',     category: 'shopping',      model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Sign up,Add to cart', comment: 'Install Nykaa and add any product to cart', description: 'Beauty & fashion — premium brands online' },
  { name: 'Myntra Shopping',   category: 'shopping',      model: 'CPS', payout: 80,  userPayout: 60,  steps: 'Install,Login,Purchase', comment: 'Install Myntra and make a purchase of ₹199+ to earn ₹60', description: 'India\'s biggest fashion & lifestyle platform' },
  { name: 'Ajio Fashion',      category: 'shopping',      model: 'CPS', payout: 70,  userPayout: 52,  steps: 'Install,Register,First purchase', comment: 'Install AJIO and place your first order to earn ₹52', description: 'Trending fashion — brand-new arrivals daily' },
  { name: 'Snapdeal',          category: 'shopping',      model: 'CPI', payout: 40,  userPayout: 30,  steps: 'Install,Login,Browse 5 min', comment: 'Install Snapdeal and browse for 5 minutes to earn ₹30', description: 'Huge discounts on electronics, fashion & more' },
  { name: 'Tata CLiQ',         category: 'shopping',      model: 'CPS', payout: 90,  userPayout: 68,  steps: 'Install,Account,Purchase', comment: 'Install Tata CLiQ and make your first purchase to earn ₹68', description: 'Tata\'s premium shopping experience' },
  { name: 'Flipkart App',      category: 'shopping',      model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Login,Add wishlist', comment: 'Install Flipkart and add 3 items to wishlist to earn ₹38', description: 'India\'s biggest e-commerce marketplace' },
  { name: 'Purplle Beauty',    category: 'shopping',      model: 'CPI', payout: 48,  userPayout: 36,  steps: 'Install,Register,Explore', comment: 'Install Purplle and explore products to earn ₹36', description: 'Online beauty store — skincare & cosmetics' },

  // ── FOOD (8) ─────────────────────────────────────────────────────────────
  { name: 'Swiggy Food',       category: 'food',          model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Login,First order', comment: 'Install Swiggy and place your first food order', description: 'Food delivery in 30 minutes to your door' },
  { name: 'Zomato Pro',        category: 'food',          model: 'CPI', payout: 65,  userPayout: 48,  steps: 'Install,Register,Order food', comment: 'Install Zomato and order food once to earn ₹48', description: 'Order food, groceries & explore restaurants' },
  { name: 'Blinkit Grocery',   category: 'food',          model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Sign up,First order', comment: 'Install Blinkit and place your first grocery order', description: '10-minute grocery delivery near you' },
  { name: 'BB Daily',          category: 'food',          model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Register,Subscribe', comment: 'Install BB Daily and subscribe to get ₹34', description: 'Daily milk & grocery delivery at your door' },
  { name: 'EatFit Health',     category: 'food',          model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Sign up,Order', comment: 'Install EatFit and order a healthy meal to earn ₹38', description: 'Healthy meal delivery — nutritionist approved' },
  { name: 'Rebel Foods',       category: 'food',          model: 'CPI', payout: 48,  userPayout: 36,  steps: 'Install,Login,Order', comment: 'Install Rebel Foods app and place your first order', description: 'Faasos, Behrouz Biryani & 10+ cloud kitchens' },
  { name: 'Dominos Pizza',     category: 'food',          model: 'CPS', payout: 70,  userPayout: 52,  steps: 'Install,Register,Order pizza', comment: 'Order a pizza from Dominos app to earn ₹52', description: 'Order Dominos pizza online — hot & fresh' },
  { name: 'Dunzo Delivery',    category: 'food',          model: 'CPI', payout: 42,  userPayout: 32,  steps: 'Install,Login,Place order', comment: 'Install Dunzo and place a delivery order to earn ₹32', description: 'Hyperlocal delivery — any item, anywhere' },

  // ── TRAVEL (8) ───────────────────────────────────────────────────────────
  { name: 'MakeMyTrip',        category: 'travel',        model: 'CPI', payout: 90,  userPayout: 68,  steps: 'Install,Register,Search trip', comment: 'Install MakeMyTrip and search for a trip to earn ₹68', description: 'Book flights, hotels & holiday packages' },
  { name: 'Yatra Travel',      category: 'travel',        model: 'CPI', payout: 75,  userPayout: 56,  steps: 'Install,Sign up,Book search', comment: 'Install Yatra and search for any booking to earn ₹56', description: 'Compare & book cheap flights and hotels' },
  { name: 'Ola Cabs',          category: 'travel',        model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Register,Take ride', comment: 'Install Ola and take your first ride to earn ₹40', description: 'Book auto, cab or bike rides instantly' },
  { name: 'Rapido Bike Taxi',  category: 'travel',        model: 'CPI', payout: 40,  userPayout: 30,  steps: 'Install,Login,First ride', comment: 'Install Rapido and take a bike ride to earn ₹30', description: 'Fast & affordable bike taxi service' },
  { name: 'Airbnb India',      category: 'travel',        model: 'CPI', payout: 80,  userPayout: 60,  steps: 'Install,Sign up,Wishlist', comment: 'Install Airbnb and add 3 listings to wishlist to earn ₹60', description: 'Book unique places to stay around the world' },
  { name: 'Goibibo Travels',   category: 'travel',        model: 'CPI', payout: 70,  userPayout: 52,  steps: 'Install,Login,Search trip', comment: 'Install Goibibo and search for a hotel to earn ₹52', description: 'Great deals on flights & hotel bookings' },
  { name: 'Uber Rides India',  category: 'travel',        model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Register,First ride', comment: 'Install Uber and take your first ride to earn ₹45', description: 'Reliable & affordable rides at the tap of a button' },
  { name: 'IRCTC Rail',        category: 'travel',        model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Register,Book ticket', comment: 'Install IRCTC Rail Connect and book a ticket to earn ₹38', description: 'Book train tickets directly from IRCTC' },

  // ── EDUCATION (8) ────────────────────────────────────────────────────────
  { name: 'BYJU\'S Learning',  category: 'education',     model: 'CPL', payout: 100, userPayout: 75,  steps: 'Install,Register,Free class', comment: 'Install BYJU\'S and attend a free class to earn ₹75', description: 'India\'s largest ed-tech platform for K–12' },
  { name: 'Unacademy',         category: 'education',     model: 'CPL', payout: 85,  userPayout: 64,  steps: 'Install,Sign up,Watch lesson', comment: 'Install Unacademy and watch any lesson to earn ₹64', description: 'India\'s top educators in one platform' },
  { name: 'Vedantu Live',      category: 'education',     model: 'CPL', payout: 90,  userPayout: 68,  steps: 'Install,Register,Live class', comment: 'Install Vedantu and attend a live class to earn ₹68', description: 'Live online tutoring from expert teachers' },
  { name: 'Duolingo English',  category: 'education',     model: 'CPI', payout: 40,  userPayout: 30,  steps: 'Install,Register,Lesson 1', comment: 'Install Duolingo and complete your first lesson', description: 'Learn English & 40+ languages for free' },
  { name: 'Coursera Learn',    category: 'education',     model: 'CPL', payout: 110, userPayout: 82,  steps: 'Install,Register,Enroll course', comment: 'Install Coursera and enroll in a free course', description: 'Online courses from world top universities' },
  { name: 'Testbook Exam',     category: 'education',     model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Sign up,Mock test', comment: 'Install Testbook and take a free mock test to earn ₹40', description: 'Prepare for govt exams — SSC, Banking, Railways' },
  { name: 'Physics Wallah',    category: 'education',     model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Register,Watch class', comment: 'Install PW app and watch a class to earn ₹38', description: 'Affordable JEE & NEET preparation by Alakh Pandey' },
  { name: 'Skill India Portal',category: 'education',     model: 'CPL', payout: 65,  userPayout: 48,  steps: 'Install,Register,Enroll skill', comment: 'Register on Skill India and enroll in a skill course', description: 'Free skill development courses by Government of India' },

  // ── ENTERTAINMENT (8) ────────────────────────────────────────────────────
  { name: 'Disney+ Hotstar',   category: 'entertainment', model: 'CPI', payout: 70,  userPayout: 52,  steps: 'Install,Register,Watch 10 min', comment: 'Install Hotstar and watch 10 minutes of any content', description: 'IPL, movies, web series — all in one place' },
  { name: 'MX Player',         category: 'entertainment', model: 'CPI', payout: 35,  userPayout: 26,  steps: 'Install,Sign up,Watch video', comment: 'Install MX Player and watch any video to earn ₹26', description: 'Watch web series, movies & news for free' },
  { name: 'Zee5 Premium',      category: 'entertainment', model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Register,Watch show', comment: 'Install ZEE5 and watch any show to earn ₹40', description: 'Indian content — shows, movies, live TV' },
  { name: 'ALTBalaji',         category: 'entertainment', model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Register,Subscribe', comment: 'Install ALTBalaji and watch the first episode free', description: 'Bold Hindi web series & originals' },
  { name: 'ShareChat',         category: 'entertainment', model: 'CPI', payout: 30,  userPayout: 22,  steps: 'Install,Login,Post 1 content', comment: 'Install ShareChat and post your first content to earn ₹22', description: 'Indian social media in your local language' },
  { name: 'Josh Short Videos', category: 'entertainment', model: 'CPI', payout: 28,  userPayout: 20,  steps: 'Install,Register,Create video', comment: 'Install Josh and create your first short video', description: 'Made-in-India short video platform' },
  { name: 'Moj Videos',        category: 'entertainment', model: 'CPI', payout: 28,  userPayout: 20,  steps: 'Install,Sign up,Follow 5 people', comment: 'Install Moj and follow 5 creators to earn ₹20', description: 'Short videos in Indian languages — viral content' },
  { name: 'SonyLIV Stream',    category: 'entertainment', model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Register,Watch match', comment: 'Install SonyLIV and watch any live match to earn ₹45', description: 'Sports, movies & originals on SonyLIV' },

  // ── BUSINESS (8) ─────────────────────────────────────────────────────────
  { name: 'IndiaMART Buyer',   category: 'business',      model: 'CPL', payout: 80,  userPayout: 60,  steps: 'Install,Register,Post query', comment: 'Install IndiaMART and post a buyer query to earn ₹60', description: 'Find & connect with B2B suppliers on IndiaMART' },
  { name: 'Udaan B2B',         category: 'business',      model: 'CPL', payout: 70,  userPayout: 52,  steps: 'Install,Register,First order', comment: 'Register on Udaan and place your first B2B order', description: 'B2B commerce platform for retailers & traders' },
  { name: 'Zoho Desk',         category: 'business',      model: 'CPL', payout: 90,  userPayout: 68,  steps: 'Install,Sign up,Create ticket', comment: 'Install Zoho Desk and create a support ticket to earn ₹68', description: 'Customer service software for small businesses' },
  { name: 'Razorpay Business', category: 'business',      model: 'CPA', payout: 150, userPayout: 112, steps: 'Sign up,Add business,Activate', comment: 'Open a Razorpay business account and activate it', description: 'Accept payments online — India\'s leading gateway' },
  { name: 'Khatabook',         category: 'business',      model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Register,Add ledger', comment: 'Install Khatabook and add your first ledger entry', description: 'Digital ledger for shop owners — free hisaab kitaab' },
  { name: 'OkCredit',          category: 'business',      model: 'CPI', payout: 40,  userPayout: 30,  steps: 'Install,Register,Record credit', comment: 'Install OkCredit and record your first entry to earn ₹30', description: 'Credit management app for small businesses' },
  { name: 'Vyapar Accounts',   category: 'business',      model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Sign up,Create invoice', comment: 'Install Vyapar and create your first invoice to earn ₹45', description: 'GST billing & accounting for Indian businesses' },
  { name: 'NoBroker Homes',    category: 'business',      model: 'CPL', payout: 100, userPayout: 75,  steps: 'Install,Register,List property', comment: 'List your property on NoBroker to earn ₹75', description: 'Buy, sell & rent property without broker fees' },

  // ── PRODUCTIVITY (8) ─────────────────────────────────────────────────────
  { name: 'Notion Workspace',  category: 'productivity',  model: 'CPI', payout: 35,  userPayout: 26,  steps: 'Install,Sign up,Create page', comment: 'Install Notion and create your first page to earn ₹26', description: 'All-in-one workspace for notes, tasks & wikis' },
  { name: 'Slack Teams',       category: 'productivity',  model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Sign up,Create workspace', comment: 'Install Slack and create a workspace to earn ₹34', description: 'Team communication & collaboration tool' },
  { name: 'Trello Boards',     category: 'productivity',  model: 'CPI', payout: 38,  userPayout: 28,  steps: 'Install,Register,Create board', comment: 'Install Trello and create a project board to earn ₹28', description: 'Visual project management with cards & boards' },
  { name: 'Microsoft Teams',   category: 'productivity',  model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Sign in,Join team', comment: 'Install Teams, sign in and join any team to earn ₹38', description: 'Video meetings & team collaboration by Microsoft' },
  { name: 'Google Tasks',      category: 'productivity',  model: 'CPI', payout: 25,  userPayout: 18,  steps: 'Install,Login,Add 3 tasks', comment: 'Install Google Tasks and add 3 tasks to earn ₹18', description: 'Simple to-do list integrated with Gmail & Calendar' },
  { name: 'Todoist App',       category: 'productivity',  model: 'CPI', payout: 32,  userPayout: 24,  steps: 'Install,Register,Create project', comment: 'Install Todoist and create a project to earn ₹24', description: 'The best task manager — organize your life' },
  { name: 'Evernote Notes',    category: 'productivity',  model: 'CPI', payout: 35,  userPayout: 26,  steps: 'Install,Sign up,Create note', comment: 'Install Evernote and write your first note to earn ₹26', description: 'Capture notes, ideas and web clips anywhere' },
  { name: 'Clockify Timer',    category: 'productivity',  model: 'CPI', payout: 28,  userPayout: 20,  steps: 'Install,Register,Track time', comment: 'Install Clockify and track your first time entry', description: 'Free time tracking for teams & freelancers' },

  // ── NEWS (8) ─────────────────────────────────────────────────────────────
  { name: 'Inshorts News',     category: 'news',          model: 'CPI', payout: 25,  userPayout: 18,  steps: 'Install,Register,Read 5 news', comment: 'Install Inshorts and read 5 news stories to earn ₹18', description: '60-word news summaries — stay informed fast' },
  { name: 'Dailyhunt',         category: 'news',          model: 'CPI', payout: 22,  userPayout: 16,  steps: 'Install,Sign up,Follow topics', comment: 'Install Dailyhunt and follow 3 topics to earn ₹16', description: 'News in Indian languages — 14 languages supported' },
  { name: 'NewsPoint Hindi',   category: 'news',          model: 'CPI', payout: 20,  userPayout: 15,  steps: 'Install,Register,Read news', comment: 'Install NewsPoint and read 10 articles to earn ₹15', description: 'Hindi & regional news from 500+ trusted sources' },
  { name: 'Times of India',    category: 'news',          model: 'CPI', payout: 28,  userPayout: 20,  steps: 'Install,Login,Subscribe alerts', comment: 'Install TOI app and enable breaking news alerts', description: 'India\'s most-read English daily newspaper app' },
  { name: 'Flipboard Mag',     category: 'news',          model: 'CPI', payout: 22,  userPayout: 16,  steps: 'Install,Sign up,Create magazine', comment: 'Install Flipboard and create a personal magazine', description: 'Curated news from your favourite topics' },
  { name: 'NDTV News App',     category: 'news',          model: 'CPI', payout: 25,  userPayout: 18,  steps: 'Install,Register,Enable notif', comment: 'Install NDTV and enable notifications to earn ₹18', description: 'Breaking news, video & live TV from NDTV' },
  { name: 'Zee News Live',     category: 'news',          model: 'CPI', payout: 22,  userPayout: 16,  steps: 'Install,Sign up,Watch bulletin', comment: 'Install Zee News and watch a live bulletin to earn ₹16', description: 'Hindi news channel — live TV & breaking news' },
  { name: 'India Today',       category: 'news',          model: 'CPI', payout: 26,  userPayout: 19,  steps: 'Install,Register,Read 5 stories', comment: 'Install India Today and read 5 articles to earn ₹19', description: 'India\'s most trusted news magazine & TV channel' },

  // ── PHOTOGRAPHY (8) ──────────────────────────────────────────────────────
  { name: 'Snapseed Edit',     category: 'photography',   model: 'CPI', payout: 20,  userPayout: 15,  steps: 'Install,Open app,Edit photo', comment: 'Install Snapseed and edit one photo to earn ₹15', description: 'Professional photo editor by Google' },
  { name: 'VSCO Camera',       category: 'photography',   model: 'CPI', payout: 25,  userPayout: 18,  steps: 'Install,Sign up,Apply filter', comment: 'Install VSCO, create account and apply a filter', description: 'Create beautiful photos with cinematic filters' },
  { name: 'Lightroom Mobile',  category: 'photography',   model: 'CPI', payout: 30,  userPayout: 22,  steps: 'Install,Sign in,Edit photo', comment: 'Install Adobe Lightroom and edit a photo to earn ₹22', description: 'Professional photo editing by Adobe' },
  { name: 'PicsArt Studio',    category: 'photography',   model: 'CPI', payout: 22,  userPayout: 16,  steps: 'Install,Register,Create art', comment: 'Install PicsArt and create any artwork to earn ₹16', description: 'Photo editor, collage maker & drawing app' },
  { name: 'Canva Design',      category: 'photography',   model: 'CPI', payout: 35,  userPayout: 26,  steps: 'Install,Sign up,Create design', comment: 'Install Canva and create a design to earn ₹26', description: 'Make stunning graphics — easy drag & drop editor' },
  { name: 'BeautyPlus Cam',    category: 'photography',   model: 'CPI', payout: 18,  userPayout: 13,  steps: 'Install,Login,Take selfie', comment: 'Install BeautyPlus and take a selfie to earn ₹13', description: 'AI beauty camera & selfie editor' },
  { name: 'Fotor Editor',      category: 'photography',   model: 'CPI', payout: 20,  userPayout: 15,  steps: 'Install,Sign up,Edit image', comment: 'Install Fotor and edit an image to earn ₹15', description: 'Photo editor with AI enhancement tools' },
  { name: 'Remove.bg App',     category: 'photography',   model: 'CPI', payout: 25,  userPayout: 18,  steps: 'Install,Register,Remove bg', comment: 'Install Remove.bg and remove background of a photo', description: 'AI background remover — instant results' },

  // ── FANTASY (9) ──────────────────────────────────────────────────────────
  { name: 'Team11 Fantasy',    category: 'fantasy',       model: 'CPI', payout: 65,  userPayout: 48,  steps: 'Install,Sign up,Create team', comment: 'Install Team11 and create your first team to earn ₹48', description: 'Fantasy cricket with daily contests' },
  { name: 'BalleBaazi',        category: 'fantasy',       model: 'CPI', payout: 60,  userPayout: 45,  steps: 'Install,Register,Join contest', comment: 'Install BalleBaazi and join a contest to earn ₹45', description: 'Fantasy sports with small entry fees' },
  { name: 'Howzat Fantasy',    category: 'fantasy',       model: 'CPI', payout: 55,  userPayout: 40,  steps: 'Install,Sign up,Team create', comment: 'Install Howzat and create a fantasy team to earn ₹40', description: 'Cricket, kabaddi & football fantasy leagues' },
  { name: 'Gamezy Fantasy',    category: 'fantasy',       model: 'CPI', payout: 70,  userPayout: 52,  steps: 'Install,Register,Deposit ₹10', comment: 'Install Gamezy and deposit ₹10 to earn ₹52', description: 'Win big with fantasy cricket & kabaddi' },
  { name: 'FanCode Sports',    category: 'fantasy',       model: 'CPI', payout: 50,  userPayout: 38,  steps: 'Install,Sign up,Watch match', comment: 'Install FanCode and watch a live match to earn ₹38', description: 'Live sports streaming & fantasy league' },
  { name: 'PlayerzPot',        category: 'fantasy',       model: 'CPI', payout: 58,  userPayout: 44,  steps: 'Install,Register,Contest', comment: 'Install PlayerzPot and join your first contest', description: 'Fantasy cricket with low entry fee contests' },
  { name: 'Rario Cricket',     category: 'fantasy',       model: 'CPI', payout: 45,  userPayout: 34,  steps: 'Install,Sign up,Collect card', comment: 'Install Rario and collect your first NFT cricket card', description: 'Official cricket NFT collectibles & fantasy' },
  { name: 'SportsBuzz11',      category: 'fantasy',       model: 'CPI', payout: 48,  userPayout: 36,  steps: 'Install,Register,Create team', comment: 'Install SportsBuzz11 and create a team to earn ₹36', description: 'Daily fantasy sports — cricket, football & more' },
  { name: 'Striker Fantasy',   category: 'fantasy',       model: 'CPI', payout: 62,  userPayout: 46,  steps: 'Install,Sign up,Join league', comment: 'Install Striker and join a fantasy league to earn ₹46', description: 'Football fantasy leagues — IPL & international' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Download image buffer from Picsum Photos */
async function downloadImage(seed) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/200/200`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`  ⚠ Image download failed for "${seed}": ${err.message}`);
    return null;
  }
}

/** Upload image buffer to S3 and create Upload DB record */
async function uploadImage(buffer, name, userId) {
  const fileName = `${name.replace(/\s+/g, '-').toLowerCase()}-icon.jpg`;
  const { key, url } = await uploadToS3(buffer, fileName, 'app_icons', 'image/jpeg');
  const upload = await Upload.create({
    userId,
    fileName: key.split('/').pop(),
    originalName: fileName,
    s3Key: key,
    contentType: 'image/jpeg',
    sizeInBytes: buffer.length,
    folder: 'app_icons',
    purpose: 'app_icon',
  });
  return { url, uploadId: upload._id };
}

const deriveOfferType = (category, model) => {
  if (category === 'gaming') return 'quiz';
  if (model === 'CPV') return 'video';
  if (['CPL', 'CPA', 'CPR', 'CPRT'].includes(model)) return 'survey';
  return 'app_install';
};

/** Seed one campaign + its offer */
async function seedOne(data, userId, index) {
  const { name, category, model, payout, userPayout, steps, comment, description } = data;

  // 1. Image
  let imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&color=fff`;
  if (!SKIP_IMAGES) {
    const buffer = await downloadImage(name + index);
    if (buffer) {
      try {
        const result = await uploadImage(buffer, name, userId);
        imageUrl = result.url;
      } catch (err) {
        console.warn(`  ⚠ S3 upload failed for "${name}": ${err.message} — using fallback URL`);
      }
    }
  }

  // 2. Campaign — advertiser payout is 1.3× user payout (platform margin)
  const campaignPayout = payout;
  const campaign = await Campaign.create({
    name,
    imageUrl,
    previewUrl: imageUrl,
    description,
    campaignUrl: `https://track.adshamper.com/click?cid={click_id}&uid={user_id}&campaign=${encodeURIComponent(name)}&src={source}`,
    category,
    model,
    status: 'active',
    events: [
      {
        name: steps.split(',')[0]?.trim() || 'Install',
        objective: model,
        cap: 1000,
        payout: campaignPayout,
        order: 1,
      },
    ],
    conversionApproval: 'automatic',
    needApproval: false,
  });

  // 3. Offer
  const offer = await Offer.create({
    campaignId: campaign._id,
    offerName: name,
    events: [
      {
        eventName: steps.split(',')[0]?.trim() || 'Install',
        payout: userPayout,
        order: 1,
      },
    ],
    steps: steps,
    comment: comment,
    termsAndConditions: `Complete all steps as described. Reward of ₹${userPayout} will be credited within 24 hours after verification. One completion per user.`,
    referTermsAndConditions: 'Referral bonus applies only to new users completing the offer for the first time.',
    type: deriveOfferType(category, model),
    status: 'active',
    offerDisplay: true,
    isActive: true,
    totalCap: 1000,
    dailyCap: 100,
    completionsPerUser: 1,
    priority: Math.ceil(userPayout / 10), // higher payout = higher priority
  });

  return { campaign, offer };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 AdsHamper Campaign Seeder');
  console.log(`   Total campaigns: ${CAMPAIGNS.length}`);
  console.log(`   Skip S3 images : ${SKIP_IMAGES}`);
  console.log(`   Batch size     : ${BATCH_SIZE}`);
  console.log('');

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB…');
  await mongoose.connect(config.MONGO_URI, { maxPoolSize: 10 });
  console.log('✅ Connected\n');

  // Get any existing user to use as Upload.userId
  const adminUser = await User.findOne({}).lean();
  if (!adminUser) {
    console.error('❌ No user found in DB. Please create at least one user account first, then re-run.');
    process.exit(1);
  }
  const userId = adminUser._id;
  console.log(`👤 Using user "${adminUser.name || adminUser.email}" (${userId}) as upload owner\n`);

  // Run in batches
  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (let i = 0; i < CAMPAIGNS.length; i += BATCH_SIZE) {
    const batch = CAMPAIGNS.slice(i, i + BATCH_SIZE);
    console.log(`⚙  Batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(CAMPAIGNS.length / BATCH_SIZE)}`);

    // Process batch sequentially to avoid hammering S3 / rate limits
    for (const [j, data] of batch.entries()) {
      const idx = i + j + 1;
      process.stdout.write(`  [${String(idx).padStart(3)}/${CAMPAIGNS.length}] ${data.name.padEnd(25)}`);
      try {
        // Skip if campaign with same name already exists
        const existing = await Campaign.findOne({ name: data.name });
        if (existing) {
          process.stdout.write(' ⏩ already exists\n');
          skipped++;
          continue;
        }

        await seedOne(data, userId, idx);
        process.stdout.write(` ✅ ₹${data.userPayout}\n`);
        created++;
      } catch (err) {
        process.stdout.write(` ❌ ${err.message}\n`);
        failed++;
      }
    }
    console.log('');
  }

  console.log('─────────────────────────────────');
  console.log(`✅ Created : ${created}`);
  console.log(`⏩ Skipped : ${skipped} (already existed)`);
  console.log(`❌ Failed  : ${failed}`);
  console.log('─────────────────────────────────');

  await mongoose.disconnect();
  console.log('\n👋 Done!');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
