import mongoose from 'mongoose';

const UploadSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName:     { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    s3Key:        { type: String, required: true, unique: true },
    contentType:  { type: String, required: true },
    sizeInBytes:  { type: Number, default: 0 },
    folder:       { type: String, enum: ['profile_photos', 'kyc_docs', 'offers', 'general', 'app_icons', 'banners'], default: 'general' },
    purpose:      { type: String, trim: true, default: null },
    isDeleted:    { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Upload', UploadSchema);
