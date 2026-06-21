const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const Position = require('../models/Position');

exports.getResults = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });

    const results = await Position.aggregate([
      { $match: { election_id: new mongoose.Types.ObjectId(election_id) } },
      {
        $lookup: {
          from: 'candidates',
          localField: '_id',
          foreignField: 'position_id',
          as: 'candidates'
        }
      },
      {
        $unwind: { path: '$candidates', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'votes',
          let: { candidateId: '$candidates._id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$candidate_id', '$$candidateId'] } } }
          ],
          as: 'votes'
        }
      },
      {
        $addFields: {
          'candidates.voteCount': { $size: '$votes' }
        }
      },
      {
        $group: {
          _id: '$_id',
          title: { $first: '$title' },
          order: { $first: '$order' },
          candidates: { $push: '$candidates' }
        }
      },
      {
        $sort: { order: 1 }
      }
    ]);

    // Clean up empty candidates arrays if a position has no candidates
    const cleanedResults = results.map(pos => {
      if (pos.candidates.length === 1 && !pos.candidates[0]._id) {
        pos.candidates = [];
      }
      // Sort candidates by vote count descending
      pos.candidates.sort((a, b) => b.voteCount - a.voteCount);
      return pos;
    });

    res.json(cleanedResults);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};
