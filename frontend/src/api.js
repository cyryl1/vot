import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// Public: Election info by code
export const getElectionByCode = (code) => api.get(`/voters/election/${code}`);

// Voter API
export const verifyVoter = (code, fullName) => api.post('/voters/verify', { code, full_name: fullName });
export const getBallot = (code) => api.get('/voters/ballot', { params: { code } });
export const submitVote = (code, voterId, votes) => api.post('/voters/vote', { code, voterId, votes });

// Admin API (Auth)
export const adminCheck = () => api.get('/admin/check');
export const adminLogin = (username, password) => api.post('/admin/login', { username, password });
export const adminLogout = () => api.post('/admin/logout');

// Admin API (Admins)
export const getAdmins = () => api.get('/admin/admins');
export const createAdmin = (data) => api.post('/admin/admins', data);
export const deleteAdmin = (id) => api.delete(`/admin/admins/${id}`);

// Admin API (Elections)
export const getElections = () => api.get('/admin/elections');
export const getElectionById = (id) => api.get(`/admin/elections/${id}`);
export const createElection = (data) => api.post('/admin/elections', data);
export const updateElection = (id, data) => api.put(`/admin/elections/${id}`, data);
export const deleteElection = (id) => api.delete(`/admin/elections/${id}`);

export const getAdminStats = (election_id) => api.get('/admin/stats', { params: { election_id } });
export const getResults = (election_id) => api.get('/admin/results', { params: { election_id } });

// Admin API (Positions)
export const getPositions = (election_id) => api.get('/admin/positions', { params: { election_id } });
export const createPosition = (data) => api.post('/admin/positions', data);
export const updatePosition = (id, data) => api.put(`/admin/positions/${id}`, data);
export const deletePosition = (id) => api.delete(`/admin/positions/${id}`);

// Admin API (Candidates)
export const getCandidates = (election_id) => api.get('/admin/candidates', { params: { election_id } });
export const createCandidate = (formData) => api.post('/admin/candidates', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateCandidate = (id, formData) => api.put(`/admin/candidates/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteCandidate = (id) => api.delete(`/admin/candidates/${id}`);
export const deleteAllCandidates = (election_id) => api.delete('/admin/candidates', { params: { election_id } });

// Admin API (Voters)
export const getVoters = (election_id) => api.get('/admin/voters', { params: { election_id } });
export const createVoter = (election_id, full_name) => api.post('/admin/voters', { election_id, full_name });
export const createBulkVoters = (election_id, voters) => api.post('/admin/voters/bulk', { election_id, voters });
export const deleteVoter = (id) => api.delete(`/admin/voters/${id}`);

export default api;
