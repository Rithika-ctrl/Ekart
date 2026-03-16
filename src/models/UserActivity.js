// UserActivity model for backend
const mongoose = require('mongoose');

const UserActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  actionType: { type: String, required: true },
  metadata: { type: Object, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserActivity', UserActivitySchema);