import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Verify from './pages/voter/Verify';
import Ballot from './pages/voter/Ballot';
import Success from './pages/voter/Success';
import AdminLogin from './pages/admin/AdminLogin';
import ElectionsList from './pages/admin/ElectionsList';
import Dashboard from './pages/admin/Dashboard';
import Results from './pages/admin/Results';

function App() {
  return (
    <Router>
      <Routes>
        {/* Voter Routes — election code in URL */}
        <Route path="/vote/:code" element={<Verify />} />
        <Route path="/vote/:code/ballot" element={<Ballot />} />
        <Route path="/vote/:code/success" element={<Success />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ElectionsList />} />
        <Route path="/admin/elections/:electionId" element={<Dashboard />} />
        <Route path="/admin/results" element={<Results />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
