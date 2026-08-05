'use strict';

/**
 * server.js — AgileFlow API entry point
 *
 * Responsibilities:
 *  1. Load environment variables
 *  2. Connect to MongoDB Atlas
 *  3. Bootstrap Express with global middleware (CORS, JSON parsing)
 *  4. Mount all API route groups
 *  5. Attach a global error handler
 *  6. Start listening
 */

const dotenv  = require('dotenv');
dotenv.config();                     // Must be called before any other require that needs env vars

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const epicRoutes    = require('./routes/epics');
const taskRoutes    = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const sprintRoutes  = require('./routes/sprints');

// ─── App Initialisation ───────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8.x handles these internally, but listed for clarity
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌  MongoDB connection error:', error.message);
    process.exit(1);   // Hard-exit so a process manager (PM2 / Docker) can restart
  }
};

connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────

// Security headers — sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
// Placed before CORS so headers are always present even for preflight rejections.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow CDN fonts/images
    contentSecurityPolicy: process.env.NODE_ENV === 'production', // only in prod
  })
);

// CORS — allow requests from the Vite dev server (and any extra origins in the env)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / Postman requests (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

const mongoSanitize = require('express-mongo-sanitize');

// Limit request body size to 2 MB to prevent payload-based DoS attacks
app.use(express.json({ limit: '2mb' }));             // Parse application/json bodies
app.use(express.urlencoded({ extended: true, limit: '2mb' }));  // Parse URL-encoded bodies
app.use(mongoSanitize());            // Sanitize input data to prevent NoSQL query injection

// ─── Request Logger (development convenience) ─────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.originalUrl}`);
  next();
});

// ─── Health-check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    db     : mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime : process.uptime(),
  });
});

const rateLimit = require('express-rate-limit');

// ─── Rate Limiter for Auth Routes ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 15,                  // Limit each IP to 15 login/register attempts per window
  standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,    // Disable `X-RateLimit-*` headers
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);   // POST /api/auth/register  POST /api/auth/login
app.use('/api/epics',    epicRoutes);                // GET/POST/PUT/DELETE /api/epics[/:id]
app.use('/api/tasks',    taskRoutes);                // GET/POST/PUT/DELETE /api/tasks[/:id]
app.use('/api/projects', projectRoutes);             // GET/POST/PUT/DELETE /api/projects[/:id]
app.use('/api/sprints',  sprintRoutes);              // GET/POST/PUT/DELETE /api/sprints[/:id]

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❗  Unhandled error:', err);

  // CORS errors get a clear 403
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ message: err.message });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `A record with that ${field} already exists.` });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error.',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  AgileFlow API listening on http://localhost:${PORT}`);
});

module.exports = app;  // Expose for testing

// End of server config - running MERN application
