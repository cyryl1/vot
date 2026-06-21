const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  voter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voter',
    required: true,
  },
  candidate_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  position_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index to ensure a voter can only vote once per position per election
voteSchema.index({ election_id: 1, voter_id: 1, position_id: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
