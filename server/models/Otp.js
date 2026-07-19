/**
 * OTP DATABASE MODEL SCHEMAS (Otp.js)
 * 
 * For Beginners:
 * This schema defines the structure for temporary One-Time Password tokens.
 * It stores the phoneNumber, the generated 6-digit otp code, and has a
 * Mongoose TTL (Time-To-Live) index that automatically sweeps and deletes
 * records after 5 minutes (300 seconds) to ensure database size remains lightweight.
 */

import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // TTL index: automatically deletes document from MongoDB after 5 minutes
});

// Wrap and export the model using our database proxy layer.
// Maps to the 'otps' collection, matching on 'phoneNumber' as the primary key.
export default createModelProxy(mongoose.model('Otp', otpSchema), 'otps', 'phoneNumber');
