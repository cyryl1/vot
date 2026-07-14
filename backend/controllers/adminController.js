const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Election = require('../models/Election');
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const Voter = require('../models/Voter');
const Vote = require('../models/Vote');
const Admin = require('../models/Admin');
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;
  try {
    const parts = imageUrl.split('/');
    if (parts.length < 2) return;
    const folder = parts[parts.length - 2];
    const fileWithExt = parts[parts.length - 1];
    const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
  }
};

// --- Auth & Admin Management ---
const seedDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      await Admin.create({ username: 'admin', password: defaultPassword });
      console.log('Default superadmin created with username "admin"');
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
  }
};
exports.seedDefaultAdmin = seedDefaultAdmin;

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

  try {
    const admin = await Admin.findOne({ username: username.trim().toLowerCase() });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await admin.comparePassword(password);
    if (isMatch) {
      req.session.isAdmin = true;
      req.session.adminId = admin._id;
      req.session.adminUsername = admin.username;
      req.session.role = admin.role || 'superadmin';
      req.session.election_id = admin.election_id;
      return res.json({ message: 'Login successful' });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
};

exports.checkAuth = (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.adminUsername, role: req.session.role || 'superadmin' });
  }
  return res.json({ authenticated: false });
};

exports.getAdmins = async (req, res) => {
  try {
    if (req.session.role === 'subadmin') return res.status(403).json({ message: 'Forbidden' });
    const admins = await Admin.find().select('-password').sort({ createdAt: 1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    if (req.session.role === 'subadmin') return res.status(403).json({ message: 'Forbidden' });
    const { username, password, role, election_id } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });
    const existing = await Admin.findOne({ username: username.trim().toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const newAdmin = await Admin.create({ 
      username, 
      password,
      role: role || 'superadmin',
      election_id: role === 'subadmin' ? election_id : null
    });
    res.status(201).json({ message: 'Admin created successfully', admin: { _id: newAdmin._id, username: newAdmin.username } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    if (req.session.role === 'subadmin') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) return res.status(400).json({ message: 'Cannot delete the last remaining admin account' });
    if (req.session.adminId === id) return res.status(400).json({ message: 'Cannot delete your own currently active account' });

    await Admin.findByIdAndDelete(id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Elections ---
exports.getElections = async (req, res) => {
  try {
    let query = {};
    if (req.session.role === 'subadmin' && req.session.election_id) {
      query = { _id: req.session.election_id };
    }
    const elections = await Election.find(query).sort({ created_at: -1 });
    res.json(elections);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getElectionById = async (req, res) => {
  try {
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== req.params.id) {
       return res.status(403).json({ message: 'Unauthorized access to this election' });
    }
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: 'Election not found' });
    res.json(election);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createElection = async (req, res) => {
  try {
    if (req.session.role === 'subadmin') return res.status(403).json({ message: 'Forbidden' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const election = await Election.create({ title });
    res.status(201).json(election);
  } catch (error) {
    res.status(400).json({ message: 'Error creating election', error: error.message });
  }
};

exports.updateElection = async (req, res) => {
  try {
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== req.params.id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    const { title, start_time, end_time, is_published } = req.body;
    const election = await Election.findByIdAndUpdate(req.params.id, { title, start_time, end_time, is_published }, { returnDocument: 'after' });
    if (!election) return res.status(404).json({ message: 'Election not found' });
    res.json(election);
  } catch (error) {
    res.status(400).json({ message: 'Error updating election', error: error.message });
  }
};

exports.deleteElection = async (req, res) => {
  try {
    if (req.session.role === 'subadmin') return res.status(403).json({ message: 'Forbidden' });
    const election_id = req.params.id;
    await Position.deleteMany({ election_id });
    
    const candidates = await Candidate.find({ election_id });
    for (const c of candidates) {
      await deleteFromCloudinary(c.image_url);
    }
    await Candidate.deleteMany({ election_id });
    await Voter.deleteMany({ election_id });
    await Vote.deleteMany({ election_id });
    
    const election = await Election.findByIdAndDelete(election_id);
    if (!election) return res.status(404).json({ message: 'Election not found' });
    
    res.json({ message: 'Election and all related data deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting election', error: error.message });
  }
};

// --- Positions ---
exports.getPositions = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const positions = await Position.find({ election_id }).sort({ order: 1 });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { election_id, title, order } = req.body;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const position = await Position.create({ election_id, title, order });
    res.status(201).json(position);
  } catch (error) {
    res.status(400).json({ message: 'Error creating position', error: error.message });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const { title, order } = req.body;
    const position = await Position.findByIdAndUpdate(req.params.id, { title, order }, { returnDocument: 'after', runValidators: true });
    if (!position) return res.status(404).json({ message: 'Position not found' });
    res.json(position);
  } catch (error) {
    res.status(400).json({ message: 'Error updating position', error: error.message });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) return res.status(404).json({ message: 'Position not found' });
    
    const candidates = await Candidate.find({ position_id: position._id });
    for (const c of candidates) {
       await deleteFromCloudinary(c.image_url);
    }
    await Candidate.deleteMany({ position_id: position._id });
    res.json({ message: 'Position deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting position', error: error.message });
  }
};

// --- Candidates ---
exports.getCandidates = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const candidates = await Candidate.find({ election_id }).populate('position_id', 'title');
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { election_id, position_id, name } = req.body;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id || !position_id) return res.status(400).json({ message: 'election_id and position_id are required' });
    
    let image_url = null;
    if (req.file) image_url = req.file.path;

    const candidate = await Candidate.create({ election_id, position_id, name, image_url });
    res.status(201).json(candidate);
  } catch (error) {
    res.status(400).json({ message: 'Error creating candidate', error: error.message });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const { position_id, name } = req.body;
    let updateData = { position_id, name };

    if (req.file) {
      updateData.image_url = req.file.path;
      const oldCandidate = await Candidate.findById(req.params.id);
      if (oldCandidate && oldCandidate.image_url) {
        await deleteFromCloudinary(oldCandidate.image_url);
      }
    }

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (error) {
    res.status(400).json({ message: 'Error updating candidate', error: error.message });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    await deleteFromCloudinary(candidate.image_url);
    res.json({ message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting candidate', error: error.message });
  }
};

exports.deleteAllCandidates = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    
    const candidates = await Candidate.find({ election_id });
    for (const c of candidates) {
      if (c.image_url) await deleteFromCloudinary(c.image_url);
    }
    await Candidate.deleteMany({ election_id });
    res.json({ message: 'All candidates deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all candidates', error: error.message });
  }
};

// --- Voters ---
exports.getVoters = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const voters = await Voter.find({ election_id }).sort({ full_name: 1 });
    res.json(voters);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addVoter = async (req, res) => {
  try {
    const { election_id, full_name } = req.body;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const voter = await Voter.create({ election_id, full_name });
    res.status(201).json(voter);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Voter with this name already exists in this election' });
    res.status(400).json({ message: 'Error adding voter', error: error.message });
  }
};

exports.addVotersBulk = async (req, res) => {
  try {
    const { election_id, voters } = req.body;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    if (!Array.isArray(voters)) return res.status(400).json({ message: 'Must provide an array of names' });
    
    const docs = voters.map(name => ({ election_id, full_name: name }));
    const result = await Voter.insertMany(docs, { ordered: false });
    res.status(201).json({ message: `Successfully added ${result.length} voters`, result });
  } catch (error) {
    if (error.code === 11000 && error.result) {
        return res.status(207).json({ 
            message: `Added ${error.result.nInserted} voters. Some failed due to duplicates.`,
            inserted: error.result.nInserted
        });
    }
    res.status(400).json({ message: 'Error adding voters in bulk', error: error.message });
  }
};

exports.deleteVoter = async (req, res) => {
  try {
    const voter = await Voter.findByIdAndDelete(req.params.id);
    if (!voter) return res.status(404).json({ message: 'Voter not found' });
    res.json({ message: 'Voter deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting voter', error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (req.session.role === 'subadmin' && req.session.election_id && req.session.election_id.toString() !== election_id) {
       return res.status(403).json({ message: 'Forbidden' });
    }
    if (!election_id) return res.status(400).json({ message: 'election_id is required' });
    const totalVoters = await Voter.countDocuments({ election_id });
    const votedCount = await Voter.countDocuments({ election_id, has_voted: true });
    const turnout = totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : 0;
    
    res.json({ totalVoters, votedCount, turnout: Number(turnout) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};
