'use strict';

/**
 * models/User.js
 *
 * Represents an AgileFlow workspace member.
 * Passwords are stored exclusively as bcrypt hashes — never plain text.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const SALT_ROUNDS = 12;  // bcrypt work factor (higher = slower + more secure)

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Name is required.'],
      trim     : true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name cannot exceed 80 characters.'],
    },

    email: {
      type     : String,
      required : [true, 'Email is required.'],
      unique   : true,             // Enforced at DB level via unique index
      lowercase: true,             // Always stored in lower-case
      trim     : true,
      match    : [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address.',
      ],
    },

    password: {
      type     : String,
      required : [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      select   : false,            // Never returned in query results by default
    },

    role: {
      type   : String,
      default: 'Developer',
      trim   : true,
      maxlength: [60, 'Role cannot exceed 60 characters.'],
    },

    avatarColor: {
      type   : String,
      default: '#6366f1',
      match  : [/^#[0-9A-Fa-f]{6}$/, 'Avatar color must be a valid hex code.'],
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters.'],
    },
  },
  {
    timestamps: true,              // Adds createdAt / updatedAt automatically
  }
);

// ─── Pre-save Hook: Hash Password ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash when the password field is new or has been modified
  if (!this.isModified('password')) return next();

  try {
    const salt    = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
/**
 * Safely compares a plain-text candidate against the stored hash.
 * Called during login to avoid timing attacks.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Remove Sensitive Fields from JSON Output ─────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
