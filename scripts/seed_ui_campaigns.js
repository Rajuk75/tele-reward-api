import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import Campaign from '../src/modules/campaigns/campaign.model.js';
import Event from '../src/modules/offers/event.model.js';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
}

const DEMO_CAMPAIGNS = [
    {
        name: 'Groww Stocks & Mutual Funds',
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&h=120&fit=crop',
        previewUrl: 'https://groww.in',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'finance',
        model: 'CPA',
        status: 'active',
        description: 'Zero brokerage stock investing & high-return direct mutual funds.',
        conversionApproval: 'automatic',
        events: [
            { name: 'App Install & KYC', objective: 'CPI', cap: 1000, advertiserPayout: 45, order: 1 },
            { name: 'First Stock Investment', objective: 'CPA', cap: 500, advertiserPayout: 85, order: 2 }
        ]
    },
    {
        name: 'Dream11 Fantasy Cricket',
        imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=120&h=120&fit=crop',
        previewUrl: 'https://dream11.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'fantasy',
        model: 'CPI',
        status: 'active',
        description: 'Create your fantasy cricket dream team and win real cash rewards daily.',
        conversionApproval: 'automatic',
        events: [
            { name: 'Register & Team Creation', objective: 'CPI', cap: 1500, advertiserPayout: 50, order: 1 },
            { name: 'Join Mega Contest', objective: 'CPA', cap: 800, advertiserPayout: 40, order: 2 }
        ]
    },
    {
        name: 'Zomato Food Delivery',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=120&fit=crop',
        previewUrl: 'https://zomato.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'food',
        model: 'CPI',
        status: 'active',
        description: 'Order food online from 50,000+ top rated restaurants with express delivery.',
        conversionApproval: 'automatic',
        events: [
            { name: 'First Food Order', objective: 'CPI', cap: 2000, advertiserPayout: 65, order: 1 }
        ]
    },
    {
        name: 'KreditBee Instant Loan',
        imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&h=120&fit=crop',
        previewUrl: 'https://kreditbee.in',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'loan',
        model: 'CPL',
        status: 'active',
        description: 'Personal loans up to ₹3,00,000 disbursed directly to bank account in 10 mins.',
        conversionApproval: 'manual',
        needApproval: true,
        events: [
            { name: 'Application & Eligibility', objective: 'CPL', cap: 500, advertiserPayout: 70, order: 1 },
            { name: 'Loan Sanction & Disbursal', objective: 'CPA', cap: 250, advertiserPayout: 130, order: 2 }
        ]
    },
    {
        name: 'Ludo King Mega Clash',
        imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=120&h=120&fit=crop',
        previewUrl: 'https://ludoking.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'gaming',
        model: 'CPI',
        status: 'active',
        description: 'Most popular online board game with multiplayer voice chat & tournaments.',
        conversionApproval: 'automatic',
        events: [
            { name: 'Install & Complete 1 Match', objective: 'CPI', cap: 3000, advertiserPayout: 35, order: 1 }
        ]
    },
    {
        name: 'Myntra Fashion Carnival',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop',
        previewUrl: 'https://myntra.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'shopping',
        model: 'CPS',
        status: 'active',
        description: 'Shop top apparel, footwear, and accessories from global fashion brands.',
        conversionApproval: 'automatic',
        events: [
            { name: 'Order Placed (Min ₹499)', objective: 'CPS', cap: 1200, advertiserPayout: 90, order: 1 }
        ]
    },
    {
        name: 'Coursera Global Tech Certification',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&h=120&fit=crop',
        previewUrl: 'https://coursera.org',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'education',
        model: 'CPA',
        status: 'inactive',
        description: 'Learn in-demand skills from Google, IBM, and top global university professors.',
        conversionApproval: 'automatic',
        events: [
            { name: 'Course Enrollment', objective: 'CPA', cap: 400, advertiserPayout: 180, order: 1 }
        ]
    },
    {
        name: 'MakeMyTrip Weekend Getaways',
        imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=120&h=120&fit=crop',
        previewUrl: 'https://makemytrip.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'travel',
        model: 'CPA',
        status: 'active',
        description: 'Best discounts on domestic flights, luxury villas, and holiday packages.',
        conversionApproval: 'automatic',
        events: [
            { name: 'Hotel / Flight Booking', objective: 'CPA', cap: 300, advertiserPayout: 210, order: 1 }
        ]
    },
    // ── Additional 18 Campaigns for Comprehensive Pagination Testing ─────────────
    {
        name: 'Swiggy Instamart Grocery',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&h=120&fit=crop',
        previewUrl: 'https://swiggy.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'food',
        model: 'CPI',
        status: 'active',
        description: 'Get groceries, snacks, and daily essentials delivered in 10 minutes.',
        events: [{ name: 'First Grocery Order', objective: 'CPI', cap: 1500, advertiserPayout: 55, order: 1 }]
    },
    {
        name: 'Zerodha Kite Trading',
        imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=120&h=120&fit=crop',
        previewUrl: 'https://kite.zerodha.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'finance',
        model: 'CPA',
        status: 'active',
        description: 'India\'s largest brokerage platform with advanced charts & zero brokerage.',
        events: [{ name: 'Account Opening & KYC', objective: 'CPA', cap: 600, advertiserPayout: 160, order: 1 }]
    },
    {
        name: 'Angel One Smart Money',
        imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=120&h=120&fit=crop',
        previewUrl: 'https://angelone.in',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'finance',
        model: 'CPA',
        status: 'active',
        description: 'Full-service digital demat account with advisory and smart money tools.',
        events: [{ name: 'Complete KYC Registration', objective: 'CPA', cap: 800, advertiserPayout: 140, order: 1 }]
    },
    {
        name: 'WinZO Gold Real Cash Games',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120&h=120&fit=crop',
        previewUrl: 'https://winzogames.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'gaming',
        model: 'CPI',
        status: 'active',
        description: 'Play 100+ skill-based mobile games and compete in national tournaments.',
        events: [{ name: 'Install & Play 3 Matches', objective: 'CPI', cap: 2500, advertiserPayout: 60, order: 1 }]
    },
    {
        name: 'Zupee Ludo Supreme',
        imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&h=120&fit=crop',
        previewUrl: 'https://zupee.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'gaming',
        model: 'CPI',
        status: 'active',
        description: 'Quick 10-minute speed ludo tournament games with real payouts.',
        events: [{ name: 'Install & Play First Round', objective: 'CPI', cap: 2000, advertiserPayout: 45, order: 1 }]
    },
    {
        name: 'Upstox Pro Investor',
        imageUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=120&h=120&fit=crop',
        previewUrl: 'https://upstox.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'finance',
        model: 'CPA',
        status: 'active',
        description: 'Trade stocks, futures & options with pro-grade TradingView integration.',
        events: [{ name: 'Demat Verification', objective: 'CPA', cap: 500, advertiserPayout: 125, order: 1 }]
    },
    {
        name: 'Tata CLiQ Luxury Fashion',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=120&h=120&fit=crop',
        previewUrl: 'https://luxury.tatacliq.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'shopping',
        model: 'CPS',
        status: 'active',
        description: 'Authentic luxury designer wear, fragrances, and premium watches.',
        events: [{ name: 'Luxury Purchase ₹1999+', objective: 'CPS', cap: 350, advertiserPayout: 175, order: 1 }]
    },
    {
        name: 'Ajio Trends & Streetwear',
        imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=120&h=120&fit=crop',
        previewUrl: 'https://ajio.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'shopping',
        model: 'CPS',
        status: 'active',
        description: 'Trending youth fashion, international brands, and everyday casual wear.',
        events: [{ name: 'Order Placed (Min ₹699)', objective: 'CPS', cap: 1000, advertiserPayout: 75, order: 1 }]
    },
    {
        name: 'Flipkart Online Shopping',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=120&h=120&fit=crop',
        previewUrl: 'https://flipkart.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'shopping',
        model: 'CPI',
        status: 'active',
        description: 'Shop electronics, smartphones, appliances, and fashion with SuperCoins.',
        events: [{ name: 'App Install & 1 Wishlist', objective: 'CPI', cap: 4000, advertiserPayout: 50, order: 1 }]
    },
    {
        name: 'Spotify Music Premium',
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&h=120&fit=crop',
        previewUrl: 'https://spotify.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'entertainment',
        model: 'CPA',
        status: 'active',
        description: 'Ad-free high-fidelity music streaming, offline downloads, and podcasts.',
        events: [{ name: 'Start 3-Month Trial', objective: 'CPA', cap: 1200, advertiserPayout: 80, order: 1 }]
    },
    {
        name: 'Netflix Originals & Movies',
        imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=120&h=120&fit=crop',
        previewUrl: 'https://netflix.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'entertainment',
        model: 'CPA',
        status: 'active',
        description: 'Unlimited movies, TV shows, anime, and award-winning documentary series.',
        events: [{ name: 'Subscription Activation', objective: 'CPA', cap: 900, advertiserPayout: 110, order: 1 }]
    },
    {
        name: 'Duolingo Language Master',
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=120&h=120&fit=crop',
        previewUrl: 'https://duolingo.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'education',
        model: 'CPI',
        status: 'active',
        description: 'Learn Spanish, French, German, or English with bite-sized daily lessons.',
        events: [{ name: 'Complete 3 Practice Lessons', objective: 'CPI', cap: 2200, advertiserPayout: 40, order: 1 }]
    },
    {
        name: 'Udemy Practical Bootcamp',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=120&h=120&fit=crop',
        previewUrl: 'https://udemy.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'education',
        model: 'CPS',
        status: 'active',
        description: '213,000+ video courses in programming, design, marketing, and business.',
        events: [{ name: 'Course Purchase', objective: 'CPS', cap: 600, advertiserPayout: 95, order: 1 }]
    },
    {
        name: 'Rapido City Bike Taxi',
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&h=120&fit=crop',
        previewUrl: 'https://rapido.bike',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'travel',
        model: 'CPI',
        status: 'active',
        description: 'Affordable, fast, and safe bike rides to beat morning traffic jams.',
        events: [{ name: 'First Ride Completed', objective: 'CPI', cap: 3500, advertiserPayout: 45, order: 1 }]
    },
    {
        name: 'Ola Daily Rides & Autos',
        imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=120&h=120&fit=crop',
        previewUrl: 'https://olacabs.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'travel',
        model: 'CPI',
        status: 'active',
        description: 'Book instant city cabs, auto-rickshaws, and outstation holiday rides.',
        events: [{ name: 'Install & Take First Ride', objective: 'CPI', cap: 2800, advertiserPayout: 55, order: 1 }]
    },
    {
        name: 'Slice Credit Card for Youth',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&h=120&fit=crop',
        previewUrl: 'https://sliceit.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'loan',
        model: 'CPL',
        status: 'active',
        description: 'Super card with up to 2% instant cashback and flexible 3-month splits.',
        events: [{ name: 'Card Approval & Activation', objective: 'CPL', cap: 450, advertiserPayout: 150, order: 1 }]
    },
    {
        name: 'MoneyTap App-Based Credit Line',
        imageUrl: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=120&h=120&fit=crop',
        previewUrl: 'https://moneytap.com',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'loan',
        model: 'CPL',
        status: 'active',
        description: 'Flexible personal credit line up to ₹5,00,000 with interest on usage only.',
        events: [{ name: 'Credit Line Sanction', objective: 'CPL', cap: 400, advertiserPayout: 110, order: 1 }]
    },
    {
        name: 'Notion All-In-One Workspace',
        imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=120&h=120&fit=crop',
        previewUrl: 'https://notion.so',
        campaignUrl: 'https://track.adshamper.com/click?aff_id={aff_id}&click_id={click_id}',
        category: 'productivity',
        model: 'CPA',
        status: 'active',
        description: 'Connected workspace for wiki, docs, notes, and project management.',
        events: [{ name: 'Work Email Sign Up', objective: 'CPA', cap: 700, advertiserPayout: 70, order: 1 }]
    }
];

async function seedCampaigns() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to MongoDB!');

    let createdCount = 0;

    for (const item of DEMO_CAMPAIGNS) {
        const { events: eventsData, ...campaignFields } = item;

        // Check if campaign already exists with same name
        let existing = await Campaign.findOne({ name: campaignFields.name, isDeleted: false });
        if (existing) {
            console.log(`ℹ️ Campaign already exists: "${campaignFields.name}", skipping.`);
            continue;
        }

        const campaign = await Campaign.create({
            ...campaignFields,
            events: []
        });

        const eventDocs = await Promise.all(
            eventsData.map((ev) =>
                Event.create({
                    ...ev,
                    campaignId: campaign._id
                })
            )
        );

        campaign.events = eventDocs.map((e) => e._id);
        campaign.totalAdvertiserPayout = eventDocs.reduce((acc, curr) => acc + (curr.advertiserPayout || 0), 0);
        await campaign.save();

        console.log(` Created Campaign: "${campaign.name}" (${campaign.category}) with ${eventDocs.length} events, total payout: ₹${campaign.totalAdvertiserPayout}`);
        createdCount++;
    }

    console.log(`\n🎉 Seeding complete! Added ${createdCount} new campaigns.`);
    await mongoose.disconnect();
    process.exit(0);
}

seedCampaigns().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
