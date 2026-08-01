'use strict';

/**
 * routes/auth.js
 *
 * Public authentication endpoints — no JWT required.
 *
 * POST /api/auth/register  — Create a new account, return a signed JWT
 * POST /api/auth/login     — Verify credentials, return a signed JWT
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

// ─── Helper: Issue a signed JWT ───────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ─── POST /api/auth/register ─────────────────────────────────────────────────
/**
 * Body: { name, email, password }
 * Returns: { token, user: { id, name, email } }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // ── Basic input validation ────────────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    // ── Duplicate email check (friendly message before Mongoose unique error) ──
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    // ── Create user (password hashed by the pre-save hook in User.js) ─────────
    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);

    console.log(`✅  [auth] New user registered: ${user.email}`);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('❗  [auth/register]', error.message);
    next(error);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Returns: { token, user: { id, name, email } }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // ── Fetch user WITH password (select:false means we must opt-in explicitly) ─
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      // Generic message — do NOT reveal whether the email exists
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    console.log(`✅  [auth] User logged in: ${user.email}`);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('❗  [auth/login]', error.message);
    next(error);
  }
});

module.exports = router;
