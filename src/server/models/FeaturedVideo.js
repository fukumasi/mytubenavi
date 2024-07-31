const mongoose = require('mongoose');

const featuredVideoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  thumbnailUrl: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

module.exports = mongoose.model('FeaturedVideo', featuredVideoSchema);