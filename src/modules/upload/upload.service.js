import Upload from './upload.model.js';
import User from '../users/user.model.js';
import { uploadToS3, getSignedDownloadUrl, getSignedUploadUrl, deleteFromS3 } from '../../core/s3.utility.js';
import logger from '../../core/logger.js';

class UploadService {
  /**
   * Helper to determine S3 folder based on upload purpose
   */
  _determineFolder(purpose, defaultFolder) {
    if (purpose === 'profile_photo') return 'profile_photos';
    if (purpose === 'kyc_document') return 'kyc_docs';
    if (purpose === 'app_icon') return 'app_icons';
    if (purpose === 'offer') return 'offers';
    return defaultFolder || 'general';
  }

  /**
   * Upload a file to S3 and save record to database
   * @param {Object} file Buffer and file metadata
   * @param {string} userId ID of the user uploading the file
   * @param {string} folder S3 Folder
   * @param {string} purpose Purpose of the upload (e.g. 'profile_photo')
   */
  async uploadFile(file, userId, folder = 'general', purpose = null) {
    const targetFolder = this._determineFolder(purpose, folder);
    logger.info(`upload.service.js >>>>> uploadFile() >>>>> Uploading file for user: ${userId} to folder: ${targetFolder}`);

    // Upload to S3
    const { key, url } = await uploadToS3(file.buffer, file.originalname, targetFolder, file.mimetype);

    // Save to DB
    const upload = await Upload.create({
      userId,
      fileName: key.split('/').pop(),
      originalName: file.originalname,
      s3Key: key,
      contentType: file.mimetype,
      sizeInBytes: file.size,
      folder: targetFolder,
      purpose,
    });

    // If purpose is profile_photo, update user
    if (purpose === 'profile_photo' && userId) {
      await User.findByIdAndUpdate(userId, { profilePhotoId: upload._id });
    }

    upload.s3Url = url;
    return upload;
  }

  /**
   * Get a pre-signed download URL for a file
   */
  async getSignedUrl(uploadId) {
    logger.info(`upload.service.js >>>>> getSignedUrl() >>>>> Getting signed URL for: ${uploadId}`);
    
    const upload = await Upload.findById(uploadId);
    if (!upload || upload.isDeleted) {
      throw new Error('Upload not found');
    }

    const signedUrl = await getSignedDownloadUrl(upload.s3Key);
    return { signedUrl, upload };
  }

  /**
   * Get a pre-signed upload URL for client side direct uploads
   */
  async getPresignedUploadUrl(userId, fileName, contentType, folder = 'general', purpose = null) {
    const targetFolder = this._determineFolder(purpose, folder);
    logger.info(`upload.service.js >>>>> getPresignedUploadUrl() >>>>> Generating upload URL for user: ${userId} to folder: ${targetFolder}`);
    
    const { key, uploadUrl } = await getSignedUploadUrl(targetFolder, fileName, contentType);

    const upload = await Upload.create({
      userId,
      fileName: key.split('/').pop(),
      originalName: fileName,
      s3Key: key,
      contentType,
      sizeInBytes: 0, // file is not uploaded yet
      folder: targetFolder,
      purpose,
    });

    if (purpose === 'profile_photo' && userId) {
      await User.findByIdAndUpdate(userId, { profilePhotoId: upload._id });
    }

    return { uploadUrl, upload };
  }

  /**
   * Get all uploads for a user
   */
  async getUserUploads(userId) {
    logger.info(`upload.service.js >>>>> getUserUploads() >>>>> Fetching uploads for user: ${userId}`);
    const uploads = await Upload.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
    return uploads;
  }

  /**
   * Delete an uploaded file
   */
  async deleteUpload(uploadId) {
    logger.info(`upload.service.js >>>>> deleteUpload() >>>>> Deleting upload: ${uploadId}`);
    
    const upload = await Upload.findById(uploadId);
    if (!upload) {
      throw new Error('Upload not found');
    }

    // Delete from S3
    await deleteFromS3(upload.s3Key);

    // Soft Delete from DB
    upload.isDeleted = true;
    await upload.save();

    return upload;
  }
}

export default new UploadService();
