/**
 * USER DATABASE MODEL SCHEMAS (User.js)
 * 
 * For Beginners:
 * In Node.js, we use Mongoose as an Object Data Modeling (ODM) library to structure
 * database records. Mongoose maps raw MongoDB data documents to standard JavaScript objects.
 * 
 * Concepts Explained:
 * 1. Mongoose Schema:
 *    A template defining the property keys, value data types (String, Date, Number),
 *    and validations (required fields, unique index keys).
 * 2. Database Proxy wrapper (`createModelProxy`):
 *    Normally, we would export `mongoose.model('User', userSchema)`.
 *    However, to let students run this project offline without needing a MongoDB database
 *    installed locally, we wrap the Mongoose Model inside our custom `createModelProxy`.
 *    If MongoDB is disconnected, the proxy automatically routes read/write operations
 *    to a global array in the server's RAM instead of throwing a database crash error.
 */

import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

// Schema defining the layout of User documents in the database
const userSchema = new mongoose.Schema({
  // Unique identification UUID string
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true }, // Trim removes trailing whitespace
  phoneNumber: { type: String, required: true, unique: true }, // Unique phone number for authentication
  createdAt: { type: Date, default: Date.now }, // Defaults to the current timestamp on creation
});

// Wrap and export the model using our database proxy layer
export default createModelProxy(mongoose.model('User', userSchema), 'users', 'userId');
