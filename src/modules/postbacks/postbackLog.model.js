import mongoose from 'mongoose';

const PostbackLogSchema = new mongoose.Schema({
    clickId:        { type: String, index: true },
    offerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullQuery:      { type: Object },
    ipAddress:      { type: String },
    secretProvided: { type: String, select: false },
    status:         { type: String, enum: ['success', 'pending_approval', 'pending_proof', 'click_not_found', 'inactive_offer', 'not_found', 'duplicate', 'invalid_secret', 'ip_not_whitelisted', 'fraud_timing', 'fraud_device', 'fraud_ip_block', 'out_of_order', 'error'], index: true },
    notes:          { type: String }
}, { timestamps: true });

PostbackLogSchema.index({ offerId:  1, createdAt: -1 });
PostbackLogSchema.index({ createdAt: -1, _id: -1 });
PostbackLogSchema.index({ status:   1, createdAt: -1 });
PostbackLogSchema.index({ clickId:  1, createdAt: -1 });

export default mongoose.model('PostbackLog', PostbackLogSchema);
