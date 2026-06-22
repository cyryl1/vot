import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminCheck, getResults, adminLogout } from '../../api';

import { SplashLoader } from './Dashboard';

function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const electionId = queryParams.get('election_id');

  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await adminCheck();
        if (!authRes.data.authenticated) {
          navigate('/admin/login', { replace: true });
          return;
        }
        const res = await getResults(electionId);
        setResults(res.data);
      } catch {
        navigate('/admin/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleLogout = async () => {
    try { await adminLogout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  };

  if (loading) {
    return <SplashLoader />;
  }

  return (
    <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>Election Results</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => navigate(`/admin/elections/${electionId}`)}>
            ← Dashboard
          </button>
          <button className="btn btn-danger" style={{ width: 'auto' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {results.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No results to display. Set up positions and candidates first.</p>
        </div>
      )}

      {results.map(position => {
        const maxVotes = position.candidates.length > 0
          ? Math.max(...position.candidates.map(c => c.voteCount), 1)
          : 1;
        const totalVotes = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);

        return (
          <div key={position._id} className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div className="position-title">
              <h2 style={{ marginBottom: 0 }}>{position.title}</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{totalVotes} total votes</span>
            </div>

            {position.candidates.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '1rem' }}>No candidates in this category.</p>
            ) : (
              position.candidates.map((candidate, idx) => {
                const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;
                const medalStyle = getMedalStyle(idx);

                return (
                  <div key={candidate._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 0',
                    borderBottom: idx < position.candidates.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}>
                    {/* Rank */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0,
                      ...medalStyle,
                    }}>
                      {idx + 1}
                    </div>

                    {/* Avatar */}
                    {candidate.image_url ? (
                      <img src={candidate.image_url} alt={candidate.name} style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${medalStyle.color || 'var(--border-color)'}`,
                        flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'var(--secondary-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        flexShrink: 0,
                        border: `2px solid ${medalStyle.color || 'var(--border-color)'}`,
                      }}>
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name + Bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: medalStyle.color || 'var(--text-main)' }}>
                          {candidate.name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>
                          {candidate.voteCount} vote{candidate.voteCount !== 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(candidate.voteCount / maxVotes) * 100}%`,
                          borderRadius: '4px',
                          background: getBarColor(idx),
                          transition: 'width 0.6s ease',
                          boxShadow: 'none',
                        }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

function getMedalStyle(index) {
  switch (index) {
    case 0: return {
      background: 'rgba(234, 179, 8, 0.15)', // Solid yellow/gold background
      color: '#EAB308',
      border: '2px solid rgba(234, 179, 8, 0.3)',
      textShadow: 'none',
    };
    case 1: return {
      background: 'rgba(148, 163, 184, 0.15)',
      color: '#94A3B8',
      border: '2px solid rgba(148, 163, 184, 0.3)',
    };
    case 2: return {
      background: 'rgba(217, 119, 6, 0.15)',
      color: '#D97706',
      border: '2px solid rgba(217, 119, 6, 0.3)',
    };
    default: return {
      background: 'var(--secondary-surface)',
      color: 'var(--text-muted)',
      border: '2px solid var(--border-color)',
    };
  }
}

function getBarColor(index) {
  switch (index) {
    case 0: return '#3B82F6'; // Cool Blue
    case 1: return '#94A3B8'; // Slate
    case 2: return '#D97706'; // Amber
    default: return 'var(--border-color)';
  }
}

export default Results;
