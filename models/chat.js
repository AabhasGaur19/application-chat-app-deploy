const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }], // Store user UIDs
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Chat', chatSchema);