import { fetchIfscDetails } from '../../core/ifsc.utility.js';
import logger from '../../core/logger.js';
import { setSuccess, setBadRequest, setServerError } from '../../core/responseHelper.js';

class PaymentMethodController {
  /**
   * @route   GET /v1/payment-methods/verify-ifsc
   * @route   GET /v1/public/verify-ifsc
   * @desc    Verify IFSC code and get bank details
   */
  verifyIfsc = async (req, res) => {
    try {
      const { ifscCode } = req.query;
      if (!ifscCode) {
        return setBadRequest(res, { message: 'IFSC code is required' });
      }

      const details = await fetchIfscDetails(ifscCode);
      return setSuccess(res, {
        message: 'IFSC details fetched successfully',
        data: details
      });
    } catch (error) {
      logger.error(`paymentMethod.controller.js << verifyIfsc() << ${error.message}`);
      if (
        error.message.includes('Invalid IFSC') ||
        error.message.includes('not found') ||
        error.message.includes('required')
      ) {
        return setBadRequest(res, { message: error.message });
      }
      return setServerError(res, { message: error.message });
    }
  };
}

export default new PaymentMethodController();
