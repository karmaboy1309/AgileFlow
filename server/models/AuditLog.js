'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    targetType: String,
    targetId: String,
    actor: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
