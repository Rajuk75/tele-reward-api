import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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
        steps: {
            type: String
        },
        journeySteps: {
            type: [String],
            default: []
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
        spinSettings: {
            enabled: {
                type: Boolean,
                default: false
            },
            slices: {
                type: [Number],
                default: [5, 10, 15, 20, 25]
            }
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
        currentInstalls: {
            type: Number,
            default: 0
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
        inputs: [{ label: String, type: { type: String }, order: Number }],
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
export const populateOfferEvents = { path: 'events', populate: { path: 'campaignEventId' } };
OfferSchema.virtual('events', { ref: 'OfferEvent', localField: '_id', foreignField: 'offerId' });
OfferSchema.index({ campaignId: 1 }, { unique: true });
OfferSchema.index({ isDeleted: 1, status: 1, priority: -1, createdAt: -1 });
OfferSchema.index({ isDeleted: 1, category: 1, priority: -1, createdAt: -1 });
OfferSchema.index({ isActive: 1, isDeleted: 1, status: 1 });
OfferSchema.index({ type: 1, isActive: 1, status: 1 });
OfferSchema.index({ isActive: 1, priority: -1 });

export default mongoose.model('Offer', OfferSchema);
