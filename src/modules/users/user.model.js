import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { USER_TYPE_ADMIN, USER_TYPE_USER } from "../../core/enums.js";

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true
        },
        phone: {
            type: String,
            required: false,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        userType: {
            type: String,
            enum: [USER_TYPE_ADMIN, USER_TYPE_USER],
            default: USER_TYPE_ADMIN
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        lastLogin: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Hash password before save
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);

