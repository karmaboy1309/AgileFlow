'use strict';

const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Component name is required.'],
      trim: true,
      maxlength: [100, 'Component name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Component', componentSchema);
