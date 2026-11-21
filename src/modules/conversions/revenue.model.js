import mongoose from 'mongoose';

/**
 * Revenue — tracks every conversion from the platform's financial perspective.
 *
 * For every completed (or pending) conversion:
 *   advertiserAmount  = What the advertiser/company pays US  (campaign event payout)
 *   userReward        = What we pay the USER                 (offer event payout)
 *   margin            = advertiserAmount − userReward        (our profit per conversion)
 *
 * This lets the admin dashboard show:
 *   - Total platform revenue
 *   - Total user payouts
 *   - Gross margin
 */
const RevenueSchema = new mongoose.Schema({
    trackingId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tracking', required: true },
    offerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: false, default: null },
    campaignId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    advertiserAmount: { type: Number, required: true, min: 0 },
    userReward:       { type: Number, required: true, min: 0 },
    margin:           { type: Number, required: true },
    eventName:        { type: String, required: true },
    status:           { type: String, enum: ['pending', 'settled', 'reversed'], default: 'pending', index: true },
    settledAt:        { type: Date, default: null },
    reversedAt:       { type: Date, default: null },
    notes:            { type: String, default: null }
}, { timestamps: true });

// ── INDEXES ───────────────────────────────────────────────────────────────────
// Primary uniqueness guard: one revenue row per click × event.
// Prevents duplicate revenue if the same postback is received more than once.
RevenueSchema.index({ trackingId: 1, eventName: 1 }, { unique: true });

RevenueSchema.index({ campaignId: 1, createdAt: -1 });
RevenueSchema.index({ offerId:    1, createdAt: -1 });
RevenueSchema.index({ userId:     1, createdAt: -1 });
RevenueSchema.index({ status:     1, createdAt: -1 });

export default mongoose.model('Revenue', RevenueSchema);
