const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const electionOpen = require('../middleware/electionOpen');

// Public: Get election info by code
router.get('/election/:code', voterController.getElectionByCode);

// Verify voter identity
router.post('/verify', voterController.verify);

// Get ballot structure (positions and candidates)
// Requires election to be open
router.get('/ballot', electionOpen, voterController.getBallotPositions);

// Submit votes
// Requires election to be open
router.post('/vote', electionOpen, voterController.vote);

module.exports = router;
