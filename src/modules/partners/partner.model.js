import mongoose from 'mongoose';

const PartnerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },

        phone: {
            type: String,
            default: null,
            trim: true
        },

        category: {
            type: String,
            enum: ['youtuber', 'telegram_admin', 'influencer', 'website_owner', 'affiliate', 'other'],
            default: 'affiliate'
        },

        channelOrPageUrl: {
            type: String,
            default: null,
            trim: true
        },

        notes: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ['active', 'inactive', 'blocked'],
            default: 'active',
            index: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model('Partner', PartnerSchema);
