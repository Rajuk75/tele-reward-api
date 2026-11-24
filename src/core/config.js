import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  PORT: process.env.PORT || 5001,
  STAGE: process.env.STAGE || 'development',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  MONGO_URI: process.env.MONGO_URI,
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || '14d',
  BASE_URL: process.env.BASE_URL || 'http://localhost:5001',
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  PAYOUT: {
    PROVIDER: 'freefokat',
    ENABLED: process.env.PAYOUT_ENABLED === 'true',
    AUTO_PAYOUT_ENABLED: process.env.PAYOUT_AUTO_ENABLED === 'true',
    MAX_AUTO_PAYOUT_AMOUNT: Number(process.env.MAX_AUTO_PAYOUT_AMOUNT) || 500,
    API_KEY: process.env.PAYOUT_API_KEY,
    SECRET_KEY: process.env.PAYOUT_SECRET_KEY,
    BASE_URL: process.env.PAYOUT_BASE_URL || 'https://ffpgapi.freefokat.in'
  }
};
