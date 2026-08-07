'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/users?query=...
router.get('/', async (req, res, next) => {
  try {
    const { query } = req.query;
    const filter = {};
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') },
      ];
    }

    const users = await User.find(filter)
      .select('_id name email avatarColor createdAt')
      .sort({ name: 1 })
      .limit(50);

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
