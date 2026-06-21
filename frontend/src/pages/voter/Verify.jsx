import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyVoter, getElectionByCode } from '../../api';

function Verify() {
  const { code } = useParams();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [election, setElection] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear session storage on load so previous voters can't go back
    sessionStorage.removeItem('voterId');
    sessionStorage.removeItem('voterName');

    // Validate election code
    const fetchElection = async () => {
      try {
        const res = await getElectionByCode(code);
        setElection(res.data);
        const now = new Date();
        const start = new Date(res.data.start_time);
        const end = new Date(res.data.end_time);

        if (now < start) {
          setError('Voting has not started for this election.');
        } else if (now > end) {
          setError('Voting has ended for this election.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid election link.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchElection();
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await verifyVoter(code, fullName.trim());
      sessionStorage.setItem('voterId', res.data.voterId);
      sessionStorage.setItem('voterName', res.data.name);
      navigate(`/vote/${code}/ballot`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="container auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span className="loader" style={{ width: '32px', height: '32px' }}></span>
      </div>
    );
  }

  const isInvalid = !election;
  const isClosed = error !== null;

  return (
    <div className="container auth-container">
      <div className="glass-card">
        <div className="auth-header">
          <h1>{election?.title || 'Election'}</h1>
          {isInvalid ? (
            <p style={{ color: 'var(--danger)' }}>This election link is invalid or has expired.</p>
          ) : isClosed ? (
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          ) : (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem',
              color: '#60A5FA',
              textAlign: 'left',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#93C5FD' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Important Notice
              </strong>
              Please enter your full name. The system only grants access to recognized members!
            </div>
          )}
        </div>

        {error && !isInvalid && !isClosed && <div className="alert alert-error">{error}</div>}

        {!isInvalid && !isClosed && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                placeholder="e.g., John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading || !fullName.trim()}>
              {loading ? <><span className="loader" style={{ marginRight: '8px', width: '16px', height: '16px' }}></span> Verifying...</> : 'Verify Identity'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Verify;
