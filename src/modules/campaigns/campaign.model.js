import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const CampaignSchema = new mongoose.Schema({
    name:                   { type: String, required: true, trim: true },
    imageUrl:               { type: String, required: true },
    previewUrl:             { type: String },
    description:            { type: String },
    campaignUrl:            { type: String, required: true },
    category:               { type: String, enum: ['business', 'education', 'entertainment', 'fantasy', 'finance', 'food', 'gaming', 'loan', 'news', 'photography', 'productivity', 'shopping', 'travel'], default: 'business' },
    model:                  { type: String, enum: ['CPA', 'CPD', 'CPG', 'CPI', 'CPL', 'CPR', 'CPRT', 'CPS', 'CPT', 'CPV'], default: 'CPI' },
    status:                 { type: String, enum: ['active', 'inactive'], default: 'active' },
    conversionApproval:     { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
    needApproval:           { type: Boolean, default: false },
    sameClickIpBlock:       { type: Boolean, default: true },
    sameConversionIpBlock:  { type: Boolean, default: true },
    conversionDelayEnabled: { type: Boolean, default: false },
    conversionDelayMinutes: { type: Number, enum: [3, 5, 10, 15, 30, 60], default: null },
    ipWhitelistEnabled:     { type: Boolean, default: false },
    ipWhitelist:            [{ type: String }],
    shaving:                { enabled: { type: Boolean, default: false }, ratio: { type: Number, default: 0, min: 0, max: 100 } },
    uniqueId:               { type: String, unique: true, default: () => uuidv4() },
    isDeleted:              { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true } });

CampaignSchema.virtual('events', {
    ref: 'CampaignEvent',
    localField: '_id',
    foreignField: 'campaignId',
    match: { isDeleted: false, offerId: null },
    options: { sort: { order: 1, _id: 1 } }
});

CampaignSchema.virtual('totalAdvertiserPayout').get(function () {
    return this.events?.reduce((sum, event) => sum + event.advertiserPayout, 0);
});

// ── INDEXES ──────────────────────────────────────────────────────────────────
CampaignSchema.index({ status: 1, isDeleted: 1 });
CampaignSchema.index({ category: 1, status: 1 });

export default mongoose.model('Campaign', CampaignSchema);
