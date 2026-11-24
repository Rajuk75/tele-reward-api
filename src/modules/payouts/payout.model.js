import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['offer_completion', 'user_referral', 'offer_referral', 'registration_bonus', 'manual_bonus', 'spin_bonus'],
            default: 'offer_completion',
            index: true
        },

        trackingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tracking',
            default: null,
            index: true
        },

        clickId: {
            type: String,
            default: null,
            index: true
        },

        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offer',
            default: null
        },

        eventName: {
            type: String,
            default: null,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },

        payoutAccount: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        payoutType: {
            type: String,
            enum: ['UPI', 'BANK', 'PAYTM'],
            default: 'UPI'
        },

        payoutHolderName: {
            type: String,
            default: null
        },

        payoutIfsc: {
            type: String,
            default: null
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ['unpaid', 'processing', 'paid', 'failed'],
            default: 'unpaid',
            index: true
        },

        payoutTransactionId: {
            type: String,
            default: null,
            index: true
        },

        utr: {
            type: String,
            default: null
        },

        payoutResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        failureReason: {
            type: String,
            default: null
        },

        paidAt: {
            type: Date,
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        notes: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// Prevent duplicate payouts for the same tracking conversion per event
PayoutSchema.index(
    { trackingId: 1, type: 1, eventName: 1 },
    { unique: true, partialFilterExpression: { trackingId: { $type: "objectId" } } }
);

export default mongoose.model('Payout', PayoutSchema);
