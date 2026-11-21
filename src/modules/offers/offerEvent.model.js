import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    campaignEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignEvent', required: true },
    userPayout: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
schema.index({ offerId: 1, campaignEventId: 1 }, { unique: true });
export default mongoose.model('OfferEvent', schema);
