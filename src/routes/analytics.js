// Analytics admin endpoint
const express = require('express');
const router = express.Router();
const UserActivity = require('../models/UserActivity');

router.get('/admin/analytics/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const actions = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;