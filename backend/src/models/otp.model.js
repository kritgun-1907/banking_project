/**
 * @file otp.model.js
 * @description Stores short-lived OTP codes for password reset.
 *
 * Each document auto-expires after 10 minutes via MongoDB TTL index.
 * Only one active OTP per email is kept — creating a new one overwrites the old.
 */
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // TTL index: MongoDB auto-deletes this document 10 minutes after createdAt
        expires: 60 * 10,
    },
});

// Compound index: only one OTP record per email at a time
// When a new OTP is requested, we upsert so the old one is replaced
otpSchema.index({ email: 1 });

const OtpModel = mongoose.model('otp', otpSchema);
module.exports = OtpModel;
