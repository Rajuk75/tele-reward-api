import mongoose from 'mongoose';
import payoutRepo from './payout.repo.js';
import freeFokatPayout from '../../core/freeFokatPayout.utility.js';
import config from '../../core/config.js';
import logger from '../../core/logger.js';

class PayoutService {

    // ==========================================================================
    // Internal Creation (Used by Postbacks, Referrals, etc.)
    // ==========================================================================

    async createPayout(data) {
        try {
            if (!data) {
                throw new Error('Payout data is required');
            }

            const payoutAccount = (data.payoutAccount || '').trim();
            if (!payoutAccount) {
                throw new Error('Payout account (UPI ID or Bank Account) is required');
            }

            const amount = Number(data.amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('A valid payout amount greater than 0 is required');
            }

            const type = data.type || 'offer_completion';
            if (type === 'offer_completion' && !data.trackingId) {
                throw new Error('trackingId is required for offer completion payout');
            }

            const payload = {
                type,
                trackingId: data.trackingId || null,
                clickId: data.clickId || null,
                offerId: data.offerId || null,
                userId: data.userId || null,
                payoutAccount,
                payoutType: (data.payoutType || 'UPI').toUpperCase(),
                payoutHolderName: data.payoutHolderName?.trim() || null,
                payoutIfsc: data.payoutIfsc?.trim() || null,
                amount,
                status: data.status || 'unpaid',
                createdBy: data.createdBy || null,
                notes: data.notes?.trim() || null
            };

            logger.info(`payout.service.js << createPayout() >>>>>> [CREATE] Account:${payload.payoutAccount} | AmountPaise:${payload.amount} (₹${payload.amount / 100}) | Type:${payload.type}`);
            return await payoutRepo.createPayout(payload);
        } catch (error) {
            logger.error(`payout.service.js << createPayout() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    // ==========================================================================
    // Admin: List All Payouts with Filtering & Pagination
    // ==========================================================================

    async getPayouts({ page = 1, limit = 20, status = '', type = '', search = '', startDate = '', endDate = '' } = {}) {
        try {
            logger.info(`payout.service.js << getPayouts() >>>>>> [FETCH] page:${page} limit:${limit} status:${status || 'all'}`);

            const filter = {};
            if (status) filter.status = status;
            if (type) filter.type = type;

            if (search) {
                const cleanSearch = search.trim();
                filter.$or = [
                    { payoutAccount: { $regex: cleanSearch, $options: 'i' } },
                    { clickId: { $regex: cleanSearch, $options: 'i' } },
                    { utr: { $regex: cleanSearch, $options: 'i' } }
                ];
            }

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
            const [payouts, total] = await Promise.all([
                payoutRepo.findPayouts(filter, { skip, limit: Number(limit) }),
                payoutRepo.countPayouts(filter)
            ]);

            return {
                payouts,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            logger.error(`payout.service.js << getPayouts() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    // ==========================================================================
    // Send Payout via Gateway (FreeFokat)
    // ==========================================================================

    async sendPayout(payoutId, adminUserId = null) {
        let payout = null;
        try {
            payout = await payoutRepo.findById(payoutId);
            if (!payout) {
                throw new Error('Payout record not found');
            }

            if (payout.status === 'paid') {
                throw new Error('This payout has already been marked as paid');
            }

            // Amount stored in paise -> convert to rupees
            const amountINR = payout.amount / 100;

            logger.info(`payout.service.js << sendPayout() >>>>>> [SEND] ID:${payoutId} | Account:${payout.payoutAccount} | Amount:₹${amountINR} | Status:${payout.status}`);

            // Mark as processing first to avoid concurrent double-sends
            await payoutRepo.updatePayout(payoutId, {
                status: 'processing',
                updatedBy: adminUserId || null
            });

            const payoutResult = await freeFokatPayout.initiatePayout({
                amountINR,
                payoutType: payout.payoutType || 'UPI',
                payoutAccount: payout.payoutAccount,
                payoutIfsc: payout.payoutIfsc || '',
                payoutHolderName: payout.payoutHolderName || '',
                orderId: payout._id
            });

            if (payoutResult.success) {
                const isFinalSuccess = payoutResult.paymentStatus === 'success';
                const updatePayload = {
                    status: isFinalSuccess ? 'paid' : 'processing',
                    payoutTransactionId: payoutResult.transactionId || null,
                    payoutResponse: payoutResult.rawResponse,
                    failureReason: null,
                    updatedBy: adminUserId || null
                };

                if (isFinalSuccess) {
                    updatePayload.paidAt = new Date();
                    if (payoutResult.rawResponse?.utr) {
                        updatePayload.utr = String(payoutResult.rawResponse.utr).trim();
                    }
                }

                const updated = await payoutRepo.updatePayout(payoutId, updatePayload);
                logger.info(`payout.service.js << sendPayout() >>>>>> [SUCCESS] ID:${payoutId} | TxnID:${payoutResult.transactionId} | Status:${updatePayload.status}`);
                return {
                    success: true,
                    message: payoutResult.message || 'Payout initiated successfully',
                    payout: updated
                };
            } else {
                const updatePayload = {
                    status: 'failed',
                    failureReason: payoutResult.message || 'Gateway initiation failed',
                    payoutResponse: payoutResult.rawResponse,
                    updatedBy: adminUserId || null
                };

                const updated = await payoutRepo.updatePayout(payoutId, updatePayload);
                logger.error(`payout.service.js << sendPayout() >>>>>> [FAILED] ID:${payoutId} | Reason:${payoutResult.message}`);
                return {
                    success: false,
                    message: payoutResult.message || 'Payout failed at gateway',
                    payout: updated
                };
            }
        } catch (error) {
            logger.error(`payout.service.js << sendPayout() >>>>>> [EXCEPTION] ID:${payoutId} | Error:${error.message}`);
            // Only update to failed if payout exists and was NOT already paid
            if (payout && payout.status !== 'paid') {
                await payoutRepo.updatePayout(payoutId, {
                    status: 'failed',
                    failureReason: error.message,
                    updatedBy: adminUserId || null
                }).catch(() => {});
            }
            throw error;
        }
    }

    // ==========================================================================
    // FreeFokat Webhook / Callback Handler (Payment Postback)
    // ==========================================================================

    async processGatewayWebhook(payload = {}) {
        try {
            logger.info(`payout.service.js << processGatewayWebhook() >>>>>> Webhook received: ${JSON.stringify(payload)}`);

            // 1. Verify Secret
            if (payload.secret && payload.secret !== config.PAYOUT.SECRET_KEY) {
                logger.warn(`payout.service.js << processGatewayWebhook() >>>>>> Secret mismatch`);
                throw new Error('Webhook secret mismatch');
            }

            // 2. Extract Txn ID, Order ID & Status
            const orderId = payload.data?.order || payload.order;
            const txnId = payload.data?.transcation_id || payload.data?.transaction_id || payload.data?.payment_id || payload.payment_id;
            const statusRaw = (payload.data?.trx_status || payload.trx_status || payload.status || '').toString().toUpperCase();
            const utr = payload.data?.utr || payload.data?.rrn || payload.utr || null;

            if (!txnId && !orderId) {
                throw new Error('Neither Transaction ID nor Order ID found in webhook payload');
            }

            // 3. Find Payout
            let payout = null;
            if (txnId) {
                payout = await payoutRepo.findByPayoutTransactionId(txnId);
            }
            if (!payout && orderId && mongoose.Types.ObjectId.isValid(orderId)) {
                payout = await payoutRepo.findById(orderId);
            }
            if (!payout && txnId && mongoose.Types.ObjectId.isValid(txnId)) {
                payout = await payoutRepo.findById(txnId);
            }

            if (!payout) {
                logger.warn(`payout.service.js << processGatewayWebhook() >>>>>> Payout not found for Txn:${txnId} / Order:${orderId}`);
                throw new Error(`Payout not found for Txn: ${txnId || orderId}`);
            }

            // 4. Update Status based on Gateway Postback
            const isSuccess = statusRaw === 'SUCCESS' || statusRaw === 'COMPLETED' || statusRaw === 'PAID';
            const isFailed = statusRaw === 'FAILED' || statusRaw === 'REJECTED';

            const updatePayload = { payoutResponse: payload };

            if (isSuccess) {
                updatePayload.status = 'paid';
                updatePayload.paidAt = new Date();
                if (utr) updatePayload.utr = String(utr).trim();
                if (txnId) updatePayload.payoutTransactionId = txnId;
            } else if (isFailed) {
                updatePayload.status = 'failed';
                updatePayload.failureReason = payload.data?.message || payload.message || 'Gateway reported transaction failure';
            }

            const updated = await payoutRepo.updatePayout(payout._id, updatePayload);
            logger.info(`payout.service.js << processGatewayWebhook() >>>>>> ID:${payout._id} updated to ${updatePayload.status} | UTR:${updatePayload.utr || 'none'}`);
            return updated;
        } catch (error) {
            logger.error(`payout.service.js << processGatewayWebhook() >>>>>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    // ==========================================================================
    // Automatic Payout Hook (Invoked upon Postback Settlement)
    // ==========================================================================

    async triggerAutoPayoutIfEligible(payoutId) {
        try {
            const isEnabled = config.PAYOUT.ENABLED && config.PAYOUT.AUTO_PAYOUT_ENABLED;
            if (!isEnabled) {
                return;
            }

            const payout = await payoutRepo.findById(payoutId);
            if (!payout || payout.status === 'paid' || payout.status === 'processing') {
                return;
            }

            const amountINR = payout.amount / 100;
            const maxAllowed = config.PAYOUT.MAX_AUTO_PAYOUT_AMOUNT || 100;

            if (amountINR > maxAllowed) {
                logger.info(`payout.service.js << triggerAutoPayoutIfEligible() >>>>>> Amount ₹${amountINR} exceeds auto-payout cap ₹${maxAllowed}. Left for manual approval.`);
                return;
            }

            logger.info(`payout.service.js << triggerAutoPayoutIfEligible() >>>>>> Auto-triggering payout ID:${payoutId} for ₹${amountINR}`);
            await this.sendPayout(payoutId);
        } catch (error) {
            logger.error(`payout.service.js << triggerAutoPayoutIfEligible() >>>>>> [ERROR] ID:${payoutId} : ${error.message}`);
        }
    }
}

export default new PayoutService();
