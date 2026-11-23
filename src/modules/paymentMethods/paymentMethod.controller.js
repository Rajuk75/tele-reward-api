import { fetchIfscDetails } from '../../core/ifsc.utility.js';
import { validateUpiId } from '../../core/upi.utility.js';
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

  /**
   * @route   GET /v1/payment-methods/verify-upi
   * @route   GET /v1/public/verify-upi
   * @desc    Verify UPI ID syntax and detect sponsor bank & app
   */
  verifyUpi = async (req, res) => {
    try {
      const vpa = req.query.vpa || req.query.upiId;
      if (!vpa) {
        return setBadRequest(res, { message: 'UPI ID is required' });
      }

      const details = validateUpiId(vpa);
      return setSuccess(res, {
        message: 'UPI details verified successfully',
        data: details
      });
    } catch (error) {
      logger.error(`paymentMethod.controller.js << verifyUpi() << ${error.message}`);
      return setBadRequest(res, { message: error.message });
    }
  };
}

export default new PaymentMethodController();
