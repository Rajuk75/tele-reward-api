import mongoose from 'mongoose';

const TrackingSchema = new mongoose.Schema(
    {
        clickId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            default: null
        },

        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offer',
            required: false,
            default: null
        },

        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            required: true
        },

        payoutAccount: {
            type: String,
            required: false,
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

        referralId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OfferReferral',
            default: null,
            index: true
        },

        status: {
            type: String,
            enum: ['clicked', 'pending', 'in_progress', 'partially_completed', 'pending_approval', 'completed', 'rejected', 'fraud', 'scrubbed'],
            default: 'clicked',
            index: true
        },

        appliedReferrerPercent: Number,
        maxUserEarningPaise: Number,
        earnedUserAmountPaise: Number,
        earnedReferrerAmountPaise: Number,
        milestones: { type: [{
            _id: false,
            campaignEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignEvent', required: true },
            offerEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferEvent', required: true },
            eventKey: String, eventName: String, order: Number,
            advertiserPayoutPaise: Number, baseUserPayoutPaise: Number,
            userSharePaise: Number, referrerSharePaise: Number,
            status: { type: String, enum: ['pending', 'completed', 'scrubbed'] },
            completedAt: Date, advertiserTxId: String, conversionIp: String
        }], default: undefined },

        completedEvent: {
            type: String,
            default: null
        },

        completedEvents: [
            {
                eventId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'CampaignEvent',
                    default: null
                },
                eventName: {
                    type: String,
                    required: true
                },
                order: {
                    type: Number,
                    required: true
                },
                amountAwarded: {
                    type: Number,
                    default: 0
                },
                completedAt: {
                    type: Date,
                    default: Date.now
                },
                conversionIp: {
                    type: String,
                    default: null
                },
                advertiserTxId: {
                    type: String,
                    default: null
                },
                approvalStatus: {
                    type: String,
                    enum: [
                        'auto_approved',
                        'pending_approval',
                        'pending_proof',
                        'pending_review',
                        'approved',
                        'rejected',
                        'scrubbed'
                    ],
                    default: 'auto_approved'
                },
                submittedProofs: [
                    {
                        label: { type: String },
                        url: { type: String },
                        value: { type: String },
                        submittedAt: { type: Date, default: Date.now },
                        _id: false
                    }
                ],
                adminNote: {
                    type: String,
                    default: null
                },
                canReupload: {
                    type: Boolean,
                    default: false
                },
                _id: false
            }
        ],

        ipAddress: {
            type: String
        },

        conversionIp: {
            type: String
        },

        deviceId: {
            type: String
        },

        deviceDetails: {
            brand: { type: String },
            model: { type: String },
            os: { type: String },
            osVersion: { type: String },
            isPhysicalDevice: { type: Boolean }
        },

        urlParams: {
            gaid: { type: String, default: null },
            source: { type: String, default: null },
            p1: { type: String, default: null },
            p2: { type: String, default: null },
            p3: { type: String, default: null },
            p4: { type: String, default: null },
            p5: { type: String, default: null },
            p6: { type: String, default: null },
            _id: false
        },

        userRewardINR: {
            type: Number,
            default: 0
        },

        advertiserAmount: {
            type: Number,
            default: 0
        },

        amountAwarded: {
            type: Number,
            default: 0
        },

        totalAmountAwarded: {
            type: Number,
            default: 0
        },

        postbackReceived: {
            type: Boolean,
            default: false
        },

        postbackRawQuery: {
            type: Object,
            default: null
        },

        clickedAt: {
            type: Date,
            default: Date.now
        },

        redirectedAt: {
            type: Date,
            default: null
        },

        conversionDate: {
            type: Date,
            default: null
        },

        adminNote: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

TrackingSchema.index({ payoutAccount: 1, offerId: 1, status: 1 });
TrackingSchema.index({ payoutAccount: 1, createdAt: -1 });
TrackingSchema.index({ userId: 1, offerId: 1, status: 1 });
TrackingSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
TrackingSchema.index({ deviceId: 1, offerId: 1, status: 1 });
TrackingSchema.index({ offerId: 1, status: 1, createdAt: -1 });
TrackingSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Tracking', TrackingSchema);
