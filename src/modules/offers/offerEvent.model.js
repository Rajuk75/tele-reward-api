import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    offerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Offer', 
        required: true 
    },
    campaignEventId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CampaignEvent', 
        required: true 
    },
    userPayout: { 
        type: Number, 
        min: 0,
        validate: Number.isFinite, 
        required: true 
    }
}, { timestamps: true });

schema.index({ offerId: 1, campaignEventId: 1 }, { unique: true });
export default mongoose.model('OfferEvent', schema);
