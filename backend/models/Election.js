const mongoose = require('mongoose');
const crypto = require('crypto');

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  election_code: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase(),
  },
  start_time: {
    type: Date,
  },
  end_time: {
    type: Date,
  },
  is_published: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Election', electionSchema);
