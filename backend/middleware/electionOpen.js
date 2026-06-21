const Election = require('../models/Election');

const electionOpen = async (req, res, next) => {
  try {
    const code = req.query.code || req.body.code;
    if (!code) {
      return res.status(400).json({ message: 'Election code is required' });
    }

    const election = await Election.findOne({ election_code: code.toUpperCase() });
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    if (!election.is_published) {
      return res.status(403).json({ message: 'Election is not yet published.' });
    }

    const now = new Date();
    if (now < election.start_time || now > election.end_time) {
      return res.status(403).json({ message: 'Voting is not active for this election.' });
    }
    
    // Attach election to request to avoid re-fetching
    req.election = election;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking election status', error: error.message });
  }
};

module.exports = electionOpen;
