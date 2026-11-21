import mongoose from 'mongoose';
import Faq from '../src/models/faq.model.js';
import connectDB from '../src/config/db.js';
import { 
  FAQ_CAT_GENERAL, 
  FAQ_CAT_OFFERS, 
  FAQ_CAT_REFERRAL, 
  FAQ_CAT_PAYMENTS, 
  FAQ_CAT_ACCOUNT 
} from '../src/constants/enums.js';

const seedFaqs = async () => {
  try {
    await connectDB();
    
    const faqs = [
      // General
      {
        question: 'What is AdsHamper?',
        answer: 'AdsHamper is a platform where you can earn rewards by completing simple tasks, offers, and referring friends.',
        category: FAQ_CAT_GENERAL,
        order: 1
      },
      // Offers
      {
        question: 'How do I earn rewards from offers?',
        answer: 'Browse the "Earn" section, select an offer, follow the instructions carefully, and complete the required steps to get your reward.',
        category: FAQ_CAT_OFFERS,
        order: 2
      },
      {
        question: 'Why is my offer still pending?',
        answer: 'Some offers require manual verification by the advertiser. This can take anywhere from a few hours to 7 days depending on the offer.',
        category: FAQ_CAT_OFFERS,
        order: 3
      },
      // Referral
      {
        question: 'How does the referral system work?',
        answer: 'Share your unique referral code with friends. When they sign up and complete their first offer, you both receive a bonus!',
        category: FAQ_CAT_REFERRAL,
        order: 4
      },
      // Payments
      {
        question: 'What are the withdrawal methods?',
        answer: 'You can withdraw your earnings via UPI, Bank Transfer, or popular digital wallets. Check the Wallet section for available options.',
        category: FAQ_CAT_PAYMENTS,
        order: 5
      },
      {
        question: 'Is there a minimum withdrawal limit?',
        answer: 'Yes, the minimum withdrawal limit is usually ₹100, but it may vary based on the payment method selected.',
        category: FAQ_CAT_PAYMENTS,
        order: 6
      },
      // Account
      {
        question: 'Can I change my registered mobile number?',
        answer: 'For security reasons, mobile numbers cannot be changed once registered. Please contact support if you need assistance.',
        category: FAQ_CAT_ACCOUNT,
        order: 7
      },
      {
        question: 'Is my data safe with AdsHamper?',
        answer: 'Yes, we use industry-standard encryption and security measures to protect your personal information and earnings.',
        category: FAQ_CAT_ACCOUNT,
        order: 8
      }
    ];

    await Faq.deleteMany({});
    await Faq.insertMany(faqs);
    
    console.log('FAQs Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error('Error Seeding FAQs:', error);
    process.exit(1);
  }
};

seedFaqs();
