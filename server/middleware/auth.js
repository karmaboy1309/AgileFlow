'use strict';

/**
 * middleware/auth.js
 *
 * JWT authentication guard.
 *
 * Usage:
 *   const protect = require('../middleware/auth');
 *   router.get('/protected-route', protect, handlerFn);
 *
 * On success: attaches `req.user = { id, name, email }` and calls next().
 * On failure: immediately responds with 401 Unauthorized.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // ── 1. Extract token from the Authorization header ─────────────────────────
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    console.warn(`🔒  [auth] No token provided — ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  // ── 2. Verify token signature and expiry ──────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const reason =
      error.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    console.warn(`🔒  [auth] ${reason} — ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: reason });
  }

  // ── 3. Load the user from DB (ensures account still exists / not deleted) ──
  try {
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.warn(`🔒  [auth] Token valid but user not found (id: ${decoded.id})`);
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    // Attach a lightweight user object — avoids leaking the password hash
    req.user = {
      id   : user._id.toString(),
      name : user.name,
      email: user.email,
    };

    console.log(`🔑  [auth] Authenticated: ${user.email} → ${req.method} ${req.originalUrl}`);
    next();
  } catch (error) {
    console.error('❗  [auth] DB lookup error:', error.message);
    next(error);   // Passed to the global error handler in server.js
  }
};

module.exports = protect;
