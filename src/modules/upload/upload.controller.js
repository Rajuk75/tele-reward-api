import uploadService from './upload.service.js';
import { setSuccess, setCreateSuccess, setServerError, setBadRequest } from '../../core/responseHelper.js';
import { getSignedDownloadUrl } from '../../core/s3.utility.js';
import logger from '../../core/logger.js';

class UploadController {

  /**
   * Upload file via multer (server-side upload)
   * POST /v1/upload
   * Body: multipart/form-data with field "file"
   * Query: ?folder=kyc&purpose=aadhaar_front
   */
  uploadFile = async (req, res) => {
    try {
      const userId = req.user._id;
      const file = req.file;
      const { folder = 'general', purpose = null } = req.query;

      if (!file) {
        return setBadRequest(res, { message: 'No file provided' });
      }

      const upload = await uploadService.uploadFile(file, userId, folder, purpose);

      return setCreateSuccess(res, {
        message: 'File uploaded successfully',
        upload,
        url: upload.s3Url,
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> uploadFile() >>>>> Error: ${error.message}`);
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * Get a signed download URL for a file
   * GET /v1/upload/:uploadId/signed-url
   */
  getSignedUrl = async (req, res) => {
    try {
      const { uploadId } = req.params;
      
      const { signedUrl, upload } = await uploadService.getSignedUrl(uploadId);

      return setSuccess(res, {
        message: 'Signed URL generated',
        signedUrl,
        upload,
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> getSignedUrl() >>>>> Error: ${error.message}`);
      if (error.message === 'Upload not found') {
        return setBadRequest(res, { message: error.message });
      }
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * Get a pre-signed upload URL (client-side direct upload)
   * POST /v1/upload/presigned-url
   * Body: { fileName, contentType, folder, purpose }
   */
  getPresignedUploadUrl = async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileName, contentType, folder = 'general', purpose = null } = req.body;

      if (!fileName || !contentType) {
        return setBadRequest(res, { message: 'fileName and contentType are required' });
      }

      const { uploadUrl, upload } = await uploadService.getPresignedUploadUrl(userId, fileName, contentType, folder, purpose);

      return setCreateSuccess(res, {
        message: 'Pre-signed upload URL generated',
        uploadUrl,
        upload,
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> getPresignedUploadUrl() >>>>> Error: ${error.message}`);
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * Get all uploads for a user
   * GET /v1/upload/user/:userId
   */
  getUserUploads = async (req, res) => {
    try {
      const { userId } = req.params;
      const uploads = await uploadService.getUserUploads(userId);

      return setSuccess(res, {
        message: 'Uploads fetched successfully',
        uploads,
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> getUserUploads() >>>>> Error: ${error.message}`);
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * Upload the calling user's own profile photo.
   * POST /v1/upload/profile-photo
   * Body: multipart/form-data  field name: "photo"
   * Returns: { upload: { _id, s3Url, ... }, user: { profilePhotoId } }
   */
  uploadProfilePhoto = async (req, res) => {
    try {
      const userId = req.user._id ?? req.user.userId;
      const file = req.file;

      if (!file) return setBadRequest(res, { message: 'No photo file provided' });

      // Validate it is an image
      if (!file.mimetype.startsWith('image/')) {
        return setBadRequest(res, { message: 'Only image files are accepted' });
      }

      const upload = await uploadService.uploadFile(file, userId.toString(), 'profile', 'profile_photo');

      return setCreateSuccess(res, {
        message: 'Profile photo uploaded successfully',
        upload: {
          _id: upload._id,
          url: upload.s3Url,
          contentType: upload.contentType,
        },
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> uploadProfilePhoto() >>>>> Error: ${error.message}`);
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * GET /v1/admin/signed-url?url=<full-s3-url>
   * Generic: returns a signed download URL for any S3 object by its full URL.
   */
  getSignedUrlByUrl = async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return setBadRequest(res, { message: 'url query param is required' });
      const key = new URL(url).pathname.substring(1);
      const signedUrl = await getSignedDownloadUrl(key);
      return setSuccess(res, { signedUrl });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> getSignedUrlByUrl() >>>>> Error: ${error.message}`);
      return setServerError(res, { message: error.message });
    }
  };

  /**
   * Soft-delete an upload
   * DELETE /v1/upload/:uploadId
   */
  deleteUpload = async (req, res) => {
    try {
      const { uploadId } = req.params;
      
      const upload = await uploadService.deleteUpload(uploadId);

      return setSuccess(res, {
        message: 'Upload deleted successfully',
        upload,
      });
    } catch (error) {
      logger.error(`upload.controller.js >>>>> deleteUpload() >>>>> Error: ${error.message}`);
      if (error.message === 'Upload not found') {
        return setBadRequest(res, { message: error.message });
      }
      return setServerError(res, { message: error.message });
    }
  };
}

export default new UploadController();
