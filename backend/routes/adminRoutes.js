const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const adminController = require('../controllers/adminController');
const resultController = require('../controllers/resultController');
const adminAuth = require('../middleware/adminAuth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for image uploads using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vot_candidates',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Auth
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/check', adminController.checkAuth);

// All routes below require admin authentication
router.use(adminAuth);

// Admins Management
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);

// Elections
router.get('/elections', adminController.getElections);
router.post('/elections', adminController.createElection);
router.get('/elections/:id', adminController.getElectionById);
router.put('/elections/:id', adminController.updateElection);
router.delete('/elections/:id', adminController.deleteElection);
router.get('/stats', adminController.getStats);

// Positions
router.get('/positions', adminController.getPositions);
router.post('/positions', adminController.createPosition);
router.put('/positions/:id', adminController.updatePosition);
router.delete('/positions/:id', adminController.deletePosition);

// Candidates
router.get('/candidates', adminController.getCandidates);
router.post('/candidates', upload.single('image'), adminController.createCandidate);
router.put('/candidates/:id', upload.single('image'), adminController.updateCandidate);
router.delete('/candidates', adminController.deleteAllCandidates);
router.delete('/candidates/:id', adminController.deleteCandidate);

// Voters
router.get('/voters', adminController.getVoters);
router.post('/voters', adminController.addVoter);
router.post('/voters/bulk', adminController.addVotersBulk);
router.delete('/voters/:id', adminController.deleteVoter);

// Results
router.get('/results', resultController.getResults);

module.exports = router;
