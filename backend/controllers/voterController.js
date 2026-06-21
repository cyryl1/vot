const Voter = require('../models/Voter');
const Vote = require('../models/Vote');
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const mongoose = require('mongoose');

// Helper to check if election is active
const isElectionActive = (election) => {
  const now = new Date();
  return now >= election.start_time && now <= election.end_time;
};

// Get election info by code (public, no auth required)
exports.getElectionByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const election = await Election.findOne({ election_code: code.toUpperCase() });

    if (!election) {
      return res.status(404).json({ message: 'Invalid election link. This election does not exist.' });
    }

    if (!election.is_published) {
      return res.status(403).json({ message: 'This election has not been published yet.' });
    }

    res.json({
      title: election.title,
      election_code: election.election_code,
      start_time: election.start_time,
      end_time: election.end_time,
      is_active: isElectionActive(election)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const { code, full_name } = req.body;
    
    if (!code || !full_name || full_name.trim() === '') {
      return res.status(400).json({ message: 'Election code and Full name are required' });
    }

    const election = await Election.findOne({ election_code: code.toUpperCase() });
    if (!election) return res.status(404).json({ message: 'Election not found' });
    if (!election.is_published) return res.status(403).json({ message: 'This election is not currently active or has expired.' });
    if (!isElectionActive(election)) return res.status(403).json({ message: 'This election is not currently active or has expired.' });

    const trimmedName = full_name.trim().toLowerCase();
    const inputParts = trimmedName.split(' ').filter(Boolean).sort().join(' ');
    
    let voter = await Voter.findOne({ election_id: election._id, full_name: trimmedName });
    
    if (!voter) {
      const allVoters = await Voter.find({ election_id: election._id });
      voter = allVoters.find(v => {
         const vParts = v.full_name.trim().toLowerCase().split(' ').filter(Boolean).sort().join(' ');
         return vParts === inputParts;
      });
    }
    
    if (!voter) {
      return res.status(404).json({ message: 'Name not found in voter registry. You are not eligible to vote.' });
    }

    if (voter.has_voted) {
      return res.status(403).json({ message: 'You have already cast your vote.' });
    }

    res.json({ 
      message: 'Verification successful', 
      voterId: voter._id,
      name: voter.full_name
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBallotPositions = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'Election code required' });

    const election = await Election.findOne({ election_code: code.toUpperCase() });
    if (!election) return res.status(404).json({ message: 'Election not found' });
    if (!election.is_published) return res.status(403).json({ message: 'Election not published' });

    const positions = await Position.find({ election_id: election._id }).sort({ order: 1 });
    const candidates = await Candidate.find({ election_id: election._id });
    
    const ballot = positions.map(pos => {
      return {
        _id: pos._id,
        title: pos.title,
        order: pos.order,
        candidates: candidates.filter(c => c.position_id.toString() === pos._id.toString())
      };
    });
    
    res.json(ballot);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.vote = async (req, res) => {
  try {
    const { code, voterId, votes } = req.body;
    
    if (!code || !voterId || !votes || !Array.isArray(votes) || votes.length === 0) {
      throw new Error('Invalid vote payload');
    }

    const election = await Election.findOne({ election_code: code.toUpperCase() });
    if (!election) throw new Error('Election not found');
    if (!election.is_published) throw new Error('Election is not published');
    if (!isElectionActive(election)) throw new Error('Election is not active or has expired');

    // 1. Check if voter exists and hasn't voted
    const voter = await Voter.findOne({ _id: voterId, election_id: election._id });
    if (!voter) {
      throw new Error('Voter not found in this election');
    }
    if (voter.has_voted) {
      throw new Error('You have already voted');
    }

    // 2. Validate all positions are voted for
    const positions = await Position.find({ election_id: election._id });
    if (votes.length !== positions.length) {
      throw new Error('You must vote for every position');
    }

    const votedPositionIds = votes.map(v => v.positionId);
    for (const pos of positions) {
      if (!votedPositionIds.includes(pos._id.toString())) {
        throw new Error(`Missing vote for position: ${pos.title}`);
      }
    }

    // 3. Insert votes
    const voteDocs = votes.map(v => ({
      election_id: election._id,
      voter_id: voterId,
      candidate_id: v.candidateId,
      position_id: v.positionId
    }));
    
    await Vote.insertMany(voteDocs);

    // 4. Mark voter as voted
    voter.has_voted = true;
    voter.voted_at = new Date();
    await voter.save();

    res.json({ message: 'Votes submitted successfully' });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
