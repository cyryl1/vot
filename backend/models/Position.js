const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  election_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Position', positionSchema);
