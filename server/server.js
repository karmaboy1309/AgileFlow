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
const versionRoutes = require('./routes/versions');
const componentRoutes = require('./routes/components');
const jqlRoutes       = require('./routes/jql');
const filterRoutes    = require('./routes/filters');
const reportRoutes    = require('./routes/reports');
const worklogRoutes   = require('./routes/worklogs');
const linkRoutes      = require('./routes/links');
const roleRoutes      = require('./routes/roles');
const userRoutes      = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const gadgetRoutes       = require('./routes/gadgets');
const webhookRoutes      = require('./routes/webhooks');
const auditRoutes        = require('./routes/audit');
const releaseRoutes   = require('./routes/releases');
const activityRoutes  = require('./routes/activity');
const labelRoutes     = require('./routes/labels');
const sprintAnalyticsRoutes = require('./routes/sprint-analytics');
const performanceRoutes = require('./routes/performance');
const forecastRoutes  = require('./routes/forecast');
const commentsRoutes      = require('./routes/comments');
const customFieldsRoutes  = require('./routes/custom-fields');
const integrationsRoutes  = require('./routes/integrations');
const retrospectivesRoutes = require('./routes/retrospectives');
const analyticsRoutes     = require('./routes/analytics');
const requestLogger       = require('./middleware/requestLogger');
const { initWebhookDispatcher } = require('./utils/webhookDispatcher');


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

// ── Dual-Tier In-Memory Rate Limiter Middleware ────────────────────────────────
const authRateLimits = {};
const apiRateLimits = {};

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  const isAuthRoute = req.originalUrl.startsWith('/api/auth');

  if (isAuthRoute) {
    const windowMs = 15 * 60 * 1000; // 15 minutes window
    if (!authRateLimits[ip]) {
      authRateLimits[ip] = { count: 1, resetTime: now + windowMs };
    } else {
      if (now > authRateLimits[ip].resetTime) {
        authRateLimits[ip] = { count: 1, resetTime: now + windowMs };
      } else {
        authRateLimits[ip].count++;
      }
    }

    if (authRateLimits[ip].count > 10) {
      console.warn(`⚠️  [rate-limit] Auth attempts exceeded for IP ${ip}`);
      return res.status(429).json({
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
      });
    }
  } else {
    const windowMs = 60 * 1000; // 1 minute window
    if (!apiRateLimits[ip]) {
      apiRateLimits[ip] = { count: 1, resetTime: now + windowMs };
    } else {
      if (now > apiRateLimits[ip].resetTime) {
        apiRateLimits[ip] = { count: 1, resetTime: now + windowMs };
      } else {
        apiRateLimits[ip].count++;
      }
    }

    if (apiRateLimits[ip].count > 120) {
      console.warn(`⚠️  [rate-limit] API limit exceeded for IP ${ip}`);
      return res.status(429).json({
        message: 'Too many requests. Please try again in a minute.'
      });
    }
  }
  next();
});

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

// ─── Request Logger ──────────────────────────────────────────────────────────
app.use(requestLogger);

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
app.use('/api/versions', versionRoutes);             // GET/POST/PUT/DELETE /api/versions[/:id]
app.use('/api/components', componentRoutes);         // GET/POST/PUT/DELETE /api/components[/:id]
app.use('/api/jql',        jqlRoutes);               // POST /api/jql/search
app.use('/api/filters',    filterRoutes);            // GET/POST/PUT/DELETE /api/filters[/:id]
app.use('/api/reports',    reportRoutes);           // GET /api/reports/burndown /velocity /cfd
app.use('/api',            worklogRoutes);          // Worklog endpoints
app.use('/api',            linkRoutes);             // Issue Links endpoints
app.use('/api',            roleRoutes);             // Project Roles endpoints
app.use('/api/users',      userRoutes);             // Workspace User Directory
app.use('/api/notifications', notificationRoutes);    // Notification Center
app.use('/api/gadgets',       gadgetRoutes);          // Workspace Dashboard Gadgets
app.use('/api/webhooks',      webhookRoutes);         // External Webhooks Trigger
app.use('/api/audit',         auditRoutes);           // System Audit Logs
app.use('/api/releases', releaseRoutes);             // GET/POST/PUT/DELETE /api/releases
app.use('/api/activity',      activityRoutes);        // Activity log feed
app.use('/api/labels',        labelRoutes);           // Cross-project label management
app.use('/api/sprints',       sprintAnalyticsRoutes); // Sprint velocity & team capacity (extends sprint routes)
app.use('/api/reports',       performanceRoutes);     // Assignee performance metrics
app.use('/api/tasks',         forecastRoutes);        // Estimated completion forecasting
app.use('/api/comments',      commentsRoutes);         // Threaded comments with reactions
app.use('/api/custom-fields', customFieldsRoutes);     // Per-project custom field definitions
app.use('/api/integrations',  integrationsRoutes);     // Webhook integration management
app.use('/api/retrospectives', retrospectivesRoutes);  // Sprint retrospective boards
app.use('/api/analytics',     analyticsRoutes);        // CFD and throughput analytics

// ─── Initialize background workers ───────────────────────────────────────────
initWebhookDispatcher();


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
