import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Offer Event Subdocument
 * Represents an individual event milestone under this offer,
 * with its own unique _id and linked to a Campaign Event.
 */
const OfferEventSubSchema = new mongoose.Schema(
    {
        campaignEventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CampaignEvent',
            required: true
        },
        userPayout: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: true }
);

const OfferSchema = new mongoose.Schema(
    {
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            required: true
        },
        category: {
            type: String,
            trim: true,
            index: true
        },
        model: {
            type: String,
            trim: true,
            index: true
        },
        offerName: {
            type: String,
            trim: true
        },
        offerId: {
            type: String,
            unique: true,
            default: () => uuidv4().slice(0, 6).toUpperCase()
        },
        events: [OfferEventSubSchema], // Legacy embedded milestones
        usesOfferEvents: Boolean,
        firstEventPayout: {
            type: Number,
            default: 0,
            index: true
        },
        totalPayout: {
            type: Number,
            default: 0,
            index: true
        },
        steps: {
            type: String
        },
        termsAndConditions: {
            type: String
        },
        referTermsAndConditions: {
            type: String
        },
        comment: {
            type: String
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'paused', 'expired'],
            default: 'active'
        },
        oneUpiOneTime: {
            type: Boolean,
            default: true
        },
        offerDisplay: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: 'app_install',
            index: true
        },
        jumperEnabled: {
            type: Boolean,
            default: false
        },
        jumperRatio: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        jumperUrl: {
            type: String,
            default: null
        },
        jumperClickCount: {
            type: Number,
            default: 0
        },
        totalCap: {
            type: Number,
            default: 1000
        },
        dailyCap: {
            type: Number,
            default: 100
        },
        completionsPerUser: {
            type: Number,
            default: 1
        },
        currentInstalls: {
            type: Number,
            default: 0
        },
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        },
        postbackSecretKey: {
            type: String,
            default: () => uuidv4(),
            select: false
        },
        postbackUrl: {
            type: String,
            default: null,
            select: false
        },
        advertiserPostbackUrl: {
            type: String,
            default: null,
            select: false
        },
        backgroundImage: {
            type: String,
            default: null
        },
        priority: {
            type: Number,
            default: 1
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// ── INDEXES ──────────────────────────────────────────────────────────────────
OfferSchema.virtual('selectedEvents', { ref: 'OfferEvent', localField: '_id', foreignField: 'offerId' });
OfferSchema.index({ campaignId: 1 }, { unique: true });
OfferSchema.index({ isDeleted: 1, status: 1, priority: -1, createdAt: -1 });
OfferSchema.index({ isDeleted: 1, category: 1, priority: -1, createdAt: -1 });
OfferSchema.index({ isActive: 1, isDeleted: 1, status: 1 });
OfferSchema.index({ type: 1, isActive: 1, status: 1 });
OfferSchema.index({ isActive: 1, priority: -1 });

export default mongoose.model('Offer', OfferSchema);
