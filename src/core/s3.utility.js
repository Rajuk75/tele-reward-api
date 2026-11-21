import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from './config.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ── S3 Client ────────────────────────────────────────────────────────────────
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = config.S3_BUCKET_NAME;

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - file content
 * @param {string} originalName - original file name (for extension)
 * @param {string} folder - S3 folder path (e.g. 'kyc', 'profile', 'offers')
 * @param {string} contentType - MIME type
 * @returns {{ key: string, url: string }}
 */
export async function uploadToS3(fileBuffer, originalName, folder = 'uploads', contentType = 'application/octet-stream') {
  try {
    const ext = path.extname(originalName);
    const key = `${folder}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    logger.info(`s3.utility.js >>>>> uploadToS3() >>>>> File uploaded: ${key}`);

    return {
      key,
      url: `https://${BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
    };
  } catch (error) {
    logger.error(`s3.utility.js >>>>> uploadToS3() >>>>> Error: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for downloading/viewing a file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - seconds until URL expires (default 1 hour)
 * @returns {string} signed URL
 */
export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    logger.info(`s3.utility.js >>>>> getSignedDownloadUrl() >>>>> Signed URL generated for: ${key}`);

    return signedUrl;
  } catch (error) {
    logger.error(`s3.utility.js >>>>> getSignedDownloadUrl() >>>>> Error: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for uploading directly from client
 * @param {string} folder - S3 folder
 * @param {string} fileName - original file name
 * @param {string} contentType - MIME type
 * @param {number} expiresIn - seconds until URL expires (default 5 min)
 * @returns {{ key: string, uploadUrl: string }}
 */
export async function getSignedUploadUrl(folder = 'uploads', fileName = 'file', contentType = 'application/octet-stream', expiresIn = 300) {
  try {
    const ext = path.extname(fileName);
    const key = `${folder}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    logger.info(`s3.utility.js >>>>> getSignedUploadUrl() >>>>> Upload URL generated for: ${key}`);

    return { key, uploadUrl };
  } catch (error) {
    logger.error(`s3.utility.js >>>>> getSignedUploadUrl() >>>>> Error: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
export async function deleteFromS3(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    logger.info(`s3.utility.js >>>>> deleteFromS3() >>>>> File deleted: ${key}`);
  } catch (error) {
    logger.error(`s3.utility.js >>>>> deleteFromS3() >>>>> Error: ${error.message}`);
    throw error;
  }
}
