import mongoose from 'mongoose';

const CampaignEventSchema = new mongoose.Schema({
    campaignId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    eventKey:          { type: String, trim: true, lowercase: true },
    name:              { type: String, required: true, trim: true },
    cap:               { type: Number, required: true, min: 1 },
    advertiserPayout:  { type: Number, required: true, min: 0 },
    order:             { type: Number, required: true, min: 1, max: 6 },
    steps:             { type: String, trim: true, default: '' },
    proofRequired:     { type: Boolean, default: false },
    proofInstructions: { type: String, trim: true, default: '' },
    proofs:            [{ label: { type: String, required: true }, type: { type: String, enum: ['image', 'text', 'pdf'], default: 'image' }, isRequired: { type: Boolean, default: true }, _id: false }],
    status:            { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted:         { type: Boolean, default: false }
}, { timestamps: true });

CampaignEventSchema.index({ campaignId: 1, eventKey: 1 }, { unique: true, partialFilterExpression: { eventKey: { $type: 'string' }, isDeleted: false } });
CampaignEventSchema.index({ campaignId: 1, order: 1 });

export default mongoose.model('CampaignEvent', CampaignEventSchema, 'events');
