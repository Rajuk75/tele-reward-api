import mongoose from 'mongoose';

const OfferReferralSchema = new mongoose.Schema(
    {
        referralCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true
        },

        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offer',
            required: true,
            index: true
        },

        referrerAccount: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        referrerType: {
            type: String,
            enum: ['UPI', 'BANK', 'PAYTM'],
            default: 'UPI'
        },

        referrerHolderName: {
            type: String,
            default: null,
            trim: true
        },

        referrerIfsc: {
            type: String,
            default: null,
            trim: true,
            uppercase: true
        },

        referrerPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 40
        },

        totalClicks: {
            type: Number,
            default: 0
        },

        totalConversions: {
            type: Number,
            default: 0
        },

        totalEarnings: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ['active', 'paused', 'expired'],
            default: 'active',
            index: true
        },

        meta: {
            ipAddress: { type: String, default: null },
            userAgent: { type: String, default: null }
        }
    },
    {
        timestamps: true
    }
);

OfferReferralSchema.virtual('refereePercent').get(function () { return 100 - this.referrerPercent; });

OfferReferralSchema.index({ referrerAccount: 1, offerId: 1 });
OfferReferralSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('OfferReferral', OfferReferralSchema);
