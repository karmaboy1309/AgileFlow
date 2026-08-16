// ─── server/middleware/requestLogger.js ──────────────────────────────────────
// Structured request logger with response time, status coloring,
// and optional slow-request alerting for performance monitoring.

'use strict';

const LOG_SLOW_THRESHOLD_MS = parseInt(process.env.LOG_SLOW_MS || '1000', 10);

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red:   '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue:  '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

function colorStatus(code) {
  if (code >= 500) return `${COLORS.red}${code}${COLORS.reset}`;
  if (code >= 400) return `${COLORS.yellow}${code}${COLORS.reset}`;
  if (code >= 300) return `${COLORS.cyan}${code}${COLORS.reset}`;
  return `${COLORS.green}${code}${COLORS.reset}`;
}

function colorMethod(method) {
  const map = { GET: COLORS.blue, POST: COLORS.green, PUT: COLORS.yellow, PATCH: COLORS.magenta, DELETE: COLORS.red };
  return `${map[method] || ''}${method.padEnd(6)}${COLORS.reset}`;
}

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  // Intercept response to log after it's sent
  const onFinish = () => {
    cleanup();
    const durationNs = process.hrtime.bigint() - startedAt;
    const ms = Number(durationNs / BigInt(1_000_000));
    const isSlow = ms > LOG_SLOW_THRESHOLD_MS;

    const statusStr = colorStatus(res.statusCode);
    const methodStr = colorMethod(req.method);
    const timeStr   = isSlow
      ? `${COLORS.red}${ms}ms ⚠ SLOW${COLORS.reset}`
      : ms > 500 ? `${COLORS.yellow}${ms}ms${COLORS.reset}` : `${COLORS.gray}${ms}ms${COLORS.reset}`;

    const userId = req.user?.id ? `[${req.user.id.slice(-6)}]` : '[anon]';
    const ip     = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

    console.log(`${methodStr} ${req.originalUrl} ${statusStr} ${timeStr} ${COLORS.gray}${userId} ${ip}${COLORS.reset}`);

    if (isSlow) {
      console.warn(`⚠  [slow-request] ${req.method} ${req.originalUrl} took ${ms}ms (threshold: ${LOG_SLOW_THRESHOLD_MS}ms)`);
    }
  };

  const onClose = () => { cleanup(); console.warn(`⚠  [aborted] ${req.method} ${req.originalUrl}`); };

  const cleanup = () => { res.removeListener('finish', onFinish); res.removeListener('close', onClose); };

  res.on('finish', onFinish);
  res.on('close',  onClose);

  next();
}

module.exports = requestLogger;
