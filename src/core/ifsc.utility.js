import ifsc from 'ifsc';
import logger from './logger.js';

const COMMON_BANKS = {
  SBIN: 'State Bank of India',
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  IDIB: 'Indian Bank',
  BKID: 'Bank of India',
  YESB: 'Yes Bank',
  INDB: 'IndusInd Bank',
  PYTM: 'Paytm Payments Bank',
  AIRP: 'Airtel Payments Bank',
  IPOS: 'India Post Payments Bank'
};

/**
 * Fetches bank details from IFSC code
 * @param {string} ifscCode 
 * @returns {Promise<{bankName: string, branchName: string, city: string, state: string, address: string, ifsc: string}>}
 */
export const fetchIfscDetails = async (ifscCode) => {
  try {
    if (!ifscCode) {
      throw new Error('IFSC code is required');
    }

    const cleanCode = ifscCode.trim().toUpperCase();
    const isValid = ifsc.validate(cleanCode);
    if (!isValid) {
      throw new Error('Invalid IFSC code format');
    }

    const bankPrefix = cleanCode.slice(0, 4);
    const defaultBankName = COMMON_BANKS[bankPrefix] || bankPrefix;

    try {
      const details = await ifsc.fetchDetails(cleanCode);
      if (details) {
        return {
          bankName: details.BANK || defaultBankName,
          branchName: details.BRANCH || '',
          city: details.CITY || '',
          state: details.STATE || '',
          address: details.ADDRESS || '',
          ifsc: details.IFSC || cleanCode
        };
      }
    } catch (fetchError) {
      // Fallback if external API has network/timeout issue
      if (ifsc.bank[bankPrefix] || COMMON_BANKS[bankPrefix]) {
        return {
          bankName: defaultBankName,
          branchName: '',
          city: '',
          state: '',
          address: '',
          ifsc: cleanCode
        };
      }
      throw fetchError;
    }

    throw new Error('Details not found for this IFSC');
  } catch (error) {
    logger.error(`ifsc.utility.js << fetchIfscDetails() << ${error.message}`);
    throw error;
  }
};
