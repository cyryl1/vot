const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  election_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  has_voted: {
    type: Boolean,
    default: false,
  },
  voted_at: {
    type: Date,
    default: null,
  },
});

voterSchema.index({ election_id: 1, full_name: 1 }, { unique: true });

module.exports = mongoose.model('Voter', voterSchema);
