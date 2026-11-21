import express from 'express';
import uploadController from './upload.controller.js';
import protectRoutes from '../../middleware/auth.middleware.js';
import { uploadSingleWithContext } from '../../core/multer.js';

const router = express.Router();

// ── Profile photo upload (own account, field name: "photo") ──────────────────
router.post('/v1/upload/profile-photo',
  protectRoutes.checkPermission("UPLOAD_USER_PROFILE_PHOTO"),
  uploadSingleWithContext('photo'),
  uploadController.uploadProfilePhoto
);

// ── Server-side upload (multipart) ────────────────────────────────────────────
router.post('/v1/upload',
  protectRoutes.checkPermission(),
  uploadSingleWithContext('file'),
  uploadController.uploadFile
);

// ── Get pre-signed upload URL (for client-side direct upload) ────────────────
router.post('/v1/upload/presigned-url',
  protectRoutes.checkPermission(),
  uploadController.getPresignedUploadUrl
);

// ── Generic signed URL by full S3 URL ────────────────────────────────────────
router.get('/v1/admin/signed-url',
  protectRoutes.checkPermission(),
  uploadController.getSignedUrlByUrl
);

// ── Get signed download URL by uploadId ──────────────────────────────────────
router.get('/v1/upload/:uploadId/signed-url',
  protectRoutes.checkPermission(),
  uploadController.getSignedUrl
);

// ── Get all uploads for a user ───────────────────────────────────────────────
router.get('/v1/upload/user/:userId',
  protectRoutes.checkPermission(),
  uploadController.getUserUploads
);

// ── Delete an upload ─────────────────────────────────────────────────────────
router.delete('/v1/upload/:uploadId',
  protectRoutes.checkPermission(),
  uploadController.deleteUpload
);

export default router;
