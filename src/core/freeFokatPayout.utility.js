import axios from 'axios';
import config from './config.js';
import logger from './logger.js';

/**
 * FreeFokat Payout Gateway Utility
 * Handles automated fund transfers, status tracking, and wallet balance via FreeFokat PG API.
 */
class FreeFokatPayout {

    /**
     * Initiates a payout transfer request
     */
    async initiatePayout({ amountINR, payoutType = 'UPI', payoutAccount, payoutIfsc = '', payoutHolderName = '', orderId }) {
        try {
            const payoutConfig = config.PAYOUT;

            if (!payoutConfig || !payoutConfig.API_KEY || !payoutConfig.SECRET_KEY) {
                throw new Error('FreeFokat API credentials (API_KEY or SECRET_KEY) are missing in configuration.');
            }

            if (!payoutConfig.ENABLED) {
                throw new Error('Payout gateway is currently disabled in system configuration.');
            }

            const isBank = payoutType.toUpperCase() === 'BANK' || payoutType.toUpperCase() === 'IMPS';
            const cleanAmount = parseFloat(Number(amountINR).toFixed(2));

            if (isNaN(cleanAmount) || cleanAmount <= 0) {
                throw new Error(`Invalid payout amount: ₹${amountINR}`);
            }

            const payload = {
                mode: isBank ? 'IMPS' : 'UPI',
                amount: cleanAmount,
                note: 'Reward',
                secret: payoutConfig.SECRET_KEY,
                order: String(orderId),
                upi: !isBank ? String(payoutAccount).trim() : '',
                account_number: isBank ? String(payoutAccount).trim() : '',
                ifsc: isBank ? String(payoutIfsc || '').trim().toUpperCase() : ''
            };

            const fullUrl = `${payoutConfig.BASE_URL.replace(/\/+$/, '')}/PayOut/`;
            logger.info(`freeFokatPayout.utility.js << initiatePayout() >>> [REQUEST] URL:${fullUrl} | OrderID:${orderId} | Mode:${payload.mode} | Amount:₹${payload.amount} | Target:${payoutAccount}`);

            const response = await axios.post(fullUrl, payload, {
                headers: {
                    'Authorization': payoutConfig.API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            logger.info(`freeFokatPayout.utility.js << initiatePayout() >>> [RESPONSE] OrderID:${orderId} | Data:${JSON.stringify(response.data)}`);

            const isApiSuccess = response.data && (response.data.status === true || response.data.status === 'true');
            const isPaymentFailed = response.data?.payment_status === 'failed' || response.data?.payment_id === 'failed';

            if (isApiSuccess && !isPaymentFailed) {
                return {
                    success: true,
                    transactionId: response.data.payment_id || response.data.txid || response.data.transcation_id || null,
                    message: response.data.message || 'Payout initiated successfully',
                    paymentStatus: response.data.payment_status || 'pending',
                    rawResponse: response.data
                };
            } else {
                return {
                    success: false,
                    message: response.data?.message || 'Payout failed at provider side',
                    rawResponse: response.data
                };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            logger.error(`freeFokatPayout.utility.js << initiatePayout() >>> [ERROR] ${errorMessage}`);
            return {
                success: false,
                message: `Payout gateway error: ${errorMessage}`,
                rawResponse: error.response?.data || error.message
            };
        }
    }

    /**
     * Check payout transaction status from gateway
     */
    async checkStatus(paymentId) {
        try {
            const payoutConfig = config.PAYOUT;
            const fullUrl = `${payoutConfig.BASE_URL.replace(/\/+$/, '')}/txnUpdate/`;

            const payload = {
                secret: payoutConfig.SECRET_KEY,
                payment_id: paymentId
            };

            const response = await axios.post(fullUrl, payload, {
                headers: {
                    'Authorization': payoutConfig.API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            logger.info(`freeFokatPayout.utility.js << checkStatus() >>> PaymentID:${paymentId} | Data:${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            logger.error(`freeFokatPayout.utility.js << checkStatus() >>> [ERROR] ${error.message}`);
            throw error;
        }
    }

    /**
     * Get Gateway Wallet Balance
     */
    async getBalance() {
        try {
            const payoutConfig = config.PAYOUT;
            const fullUrl = `${payoutConfig.BASE_URL.replace(/\/+$/, '')}/getBalance/`;

            logger.info(`freeFokatPayout.utility.js << getBalance() >>> Calling ${fullUrl}`);

            const response = await axios.post(fullUrl, {
                secret: payoutConfig.SECRET_KEY
            }, {
                headers: {
                    'Authorization': payoutConfig.API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            return response.data;
        } catch (error) {
            logger.error(`freeFokatPayout.utility.js << getBalance() >>> [ERROR] ${error.message}`);
            throw error;
        }
    }
}

export default new FreeFokatPayout();
