import recordMilestone from './recordMilestone.js';
import postbackRepo from './postback.repo.js';
import payoutRepo from '../payouts/payout.repo.js';
import logger from '../../core/logger.js';

class PostbackService {

    // ==========================================================================
    // Private Helpers: Shaving (Scrubbing) & IP Whitelist Checks
    // ==========================================================================

    _isScrubbed(campaign, clickId) {
        const ratio = campaign?.shaving?.enabled ? (campaign.shaving.ratio || 0) : 0;
        if (ratio <= 0) return false;

        const scrubbed = Math.random() * 100 < ratio;
        if (scrubbed) {
            logger.info(`postback.service.js << _isScrubbed() >>>>>> [SHAVE SCRUBBED] clickId:${clickId} (Ratio: ${ratio}%)`);
        }
        return scrubbed;
    }

    _isIpAllowed(campaign, ip) {
        if (!campaign?.ipWhitelistEnabled) return true;
        const whitelist = Array.isArray(campaign.ipWhitelist) ? campaign.ipWhitelist : [];
        if (whitelist.length === 0) return true;
        const cleanIp = (ip || '').trim();
        return whitelist.some(allowed => allowed.trim() === cleanIp);
    }

    // ==========================================================================
    // S2S Postback Handler (Advertiser Callback Conversion)
    // ==========================================================================

    async handlePostback(clickId, secret, ip, fullQuery = {}) {
        logger.info(`postback.service.js << handlePostback() >>>>>> [RECEIVED] clickId:${clickId} | event:${fullQuery.event || 'none'}`);

        if (!clickId) {
            const log = await postbackRepo.createLog({
                clickId: 'none',
                fullQuery,
                ipAddress: ip,
                status: 'click_not_found',
                notes: 'Missing clickId'
            });
            throw new Error('Missing clickId parameter');
        }

        const tracking = await postbackRepo.findTrackingWithOffer(clickId);
        if (!tracking) {
            const log = await postbackRepo.createLog({
                clickId,
                fullQuery,
                ipAddress: ip,
                status: 'click_not_found',
                notes: 'Click not found'
            });
            throw new Error('Click not found');
        }

        const offer = tracking.offerId;
        const campaign = offer?.campaignId;

        if (!offer || offer.isDeleted || offer.status !== 'active' || !offer.isActive || !campaign || campaign.isDeleted || campaign.status !== 'active') {
            const log = await postbackRepo.createLog({
                clickId,
                offerId: offer?._id || null,
                fullQuery,
                ipAddress: ip,
                status: 'inactive_offer',
                notes: 'Offer or Campaign is inactive, paused or deleted'
            });
            throw new Error('Offer or Campaign is inactive');
        }

        if (offer.postbackSecretKey && secret !== offer.postbackSecretKey) {
            const log = await postbackRepo.createLog({
                clickId,
                offerId: offer._id,
                fullQuery,
                ipAddress: ip,
                status: 'invalid_secret',
                notes: 'Secret mismatch'
            });
            throw new Error('Invalid secret key');
        }

        if (!this._isIpAllowed(campaign, ip)) {
            const log = await postbackRepo.createLog({
                clickId,
                offerId: offer._id,
                fullQuery,
                ipAddress: ip,
                status: 'ip_not_whitelisted',
                notes: `IP ${ip} not in campaign whitelist`
            });
            throw new Error('IP not whitelisted');
        }

        if (tracking.milestones?.length) {
            try {
                return await recordMilestone(tracking._id, fullQuery, ip, () => this._isScrubbed(campaign, clickId));
            } catch (error) {
                await postbackRepo.createLog({ clickId, offerId: offer._id, ipAddress: ip, status: 'error',
                    notes: error.message, fullQuery: { event: fullQuery.event ?? fullQuery.goal } });
                throw error;
            }
        }
        if (tracking.status === 'completed') {
            const log = await postbackRepo.createLog({
                clickId,
                offerId: offer._id,
                fullQuery,
                ipAddress: ip,
                status: 'duplicate',
                notes: 'Offer already completed'
            });
            throw new Error('Offer already completed');
        }

        const advertiserTxId = fullQuery.txid || fullQuery.transaction_id || null;
        const isScrubbed = this._isScrubbed(campaign, clickId);
        const eventName = fullQuery.event?.trim() || 'Install';
        const userReward = isScrubbed ? 0 : (tracking.userRewardINR ?? offer.events?.[0]?.userPayout ?? 0);
        const advertiserAmount = tracking.advertiserAmount || offer.events?.[0]?.campaignEventId?.advertiserPayout || 0;
        const now = new Date();

        // ── Scrubbed Conversion (Traffic Shaved - No User Payout) ──
        if (isScrubbed) {
            const [trackingUpdate, revenue, log] = await Promise.all([
                postbackRepo.updateTracking(tracking._id, {
                    status: 'scrubbed',
                    postbackReceived: true,
                    conversionDate: now,
                    postbackRawQuery: fullQuery,
                    completedEvent: eventName,
                    userRewardINR: 0
                }),
                postbackRepo.createRevenue({
                    trackingId: tracking._id,
                    offerId: offer._id,
                    campaignId: campaign?._id,
                    advertiserAmount,
                    userReward: 0,
                    margin: advertiserAmount,
                    eventName,
                    status: 'settled',
                    settledAt: now
                }),
                postbackRepo.createLog({
                    clickId,
                    offerId: offer._id,
                    fullQuery,
                    ipAddress: ip,
                    status: 'success',
                    notes: 'Scrubbed conversion'
                })
            ]);

            logger.info(`postback.service.js << handlePostback() >>>>>> [SCRUBBED SUCCESS] clickId:${clickId} | Event:${eventName} | Margin:₹${advertiserAmount}`);
            return { scrubbed: true, event: eventName };
        }

        // ── Genuine Conversion (User Rewarded & Postback Completed) ──
        const [trackingUpdate, revenue, offerUpdate, payout, log] = await Promise.all([
            postbackRepo.updateTracking(tracking._id, {
                status: 'completed',
                postbackReceived: true,
                conversionDate: now,
                postbackRawQuery: fullQuery,
                completedEvent: eventName,
                amountAwarded: userReward,
                totalAmountAwarded: userReward,
                completedEvents: [{
                    eventName,
                    order: 1,
                    amountAwarded: userReward,
                    completedAt: now,
                    conversionIp: ip,
                    advertiserTxId,
                    approvalStatus: 'auto_approved'
                }]
            }),
            postbackRepo.createRevenue({
                trackingId: tracking._id,
                offerId: offer._id,
                campaignId: campaign?._id,
                advertiserAmount,
                userReward,
                margin: advertiserAmount - userReward,
                eventName,
                status: 'settled',
                settledAt: now
            }),
            postbackRepo.incrementOfferInstalls(offer._id),
            payoutRepo.createPayout({
                type: 'offer_completion',
                trackingId: tracking._id,
                clickId,
                offerId: offer._id,
                userId: tracking.userId || null,
                payoutAccount: tracking.payoutAccount,
                payoutType: tracking.payoutType || 'UPI',
                payoutHolderName: tracking.payoutHolderName || null,
                payoutIfsc: tracking.payoutIfsc || null,
                amount: userReward,
                status: 'unpaid',
                notes: `Reward for ${eventName} event`
            }),
            postbackRepo.createLog({
                clickId,
                offerId: offer._id,
                fullQuery,
                ipAddress: ip,
                status: 'success',
                notes: `Paid ₹${userReward} for ${eventName} to ${tracking.payoutAccount}`
            })
        ]);

        logger.info(`postback.service.js << handlePostback() >>>>>> [POSTBACK SUCCESS] clickId:${clickId} | Reward:₹${userReward} | Account:${tracking.payoutAccount} | Event:${eventName}`);

        return {
            event: eventName,
            amountAwarded: userReward,
            payoutAccount: tracking.payoutAccount,
            status: 'completed'
        };
    }

    // ==========================================================================
    // Admin Postback Logs API
    // ==========================================================================

    async getPostbackLogs({ page = 1, limit = 20, status = '', search = '', clickId = '', startDate = '', endDate = '' } = {}) {
        logger.info(`postback.service.js << getPostbackLogs() >>>>>> [FETCH LOGS] page:${page} limit:${limit}`);
        const filter = {};
        if (status) filter.status = status;
        const searchKey = clickId || search;
        if (searchKey) filter.clickId = { $regex: searchKey, $options: 'i' };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            postbackRepo.findLogs(filter, { skip, limit: Number(limit) }),
            postbackRepo.countLogs(filter)
        ]);

        return {
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }
}

export default new PostbackService();
