const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  election_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  position_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model('Candidate', candidateSchema);
