const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, enum: ['large', 'medium', 'small'], required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Genre' },
  slug: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Genre', genreSchema);