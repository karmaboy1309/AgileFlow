'use strict';

const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
