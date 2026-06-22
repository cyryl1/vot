import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getElections, createElection, deleteElection, adminCheck, adminLogout } from '../../api';
import ConfirmModal from '../../components/ConfirmModal';

function ElectionsList() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await adminCheck();
        if (!res.data.authenticated) {
          navigate('/admin/login');
        } else {
          fetchElections();
        }
      } catch (err) {
        navigate('/admin/login');
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchElections = async () => {
    try {
      const res = await getElections();
      setElections(res.data);
    } catch (err) {
      setError('Failed to load elections.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
      navigate('/admin/login');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title) return;
    try {
      await createElection({ title });
      setShowCreate(false);
      setTitle('');
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create election.');
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteElection(deleteId);
      setDeleteId(null);
      fetchElections();
    } catch (err) {
      setError('Failed to delete election.');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><span className="loader"></span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Elections Dashboard</h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="container" style={{ flex: 1, paddingTop: '3rem' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'nowrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Manage Elections</h2>
          <button className="btn btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? (
              <><span>✕</span><span className="hide-on-mobile"> Cancel</span></>
            ) : (
              <><span>+</span><span className="hide-on-mobile"> New Election</span></>
            )}
          </button>
        </div>

        {showCreate && (
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h3>Create New Election</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Election Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: 'auto', padding: '0.75rem 2rem' }}>Create Election</button>
            </form>
          </div>
        )}

        <div className="election-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {elections.map(election => (
            <ElectionCard 
              key={election._id} 
              election={election} 
              onDelete={() => setDeleteId(election._id)} 
              onClick={() => navigate(`/admin/elections/${election._id}`)}
            />
          ))}
          {elections.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>No elections found. Create one above.</p>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Election"
        message="Are you absolutely sure? This will delete the election, ALL its positions, candidates, voters, and votes permanently."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

function ElectionCard({ election, onDelete, onClick }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState(''); // pending, active, ended

  useEffect(() => {
    if (!election.is_published) {
      setStatus('draft');
      setTimeLeft('Not Published');
      return;
    }

    const updateTime = () => {
      const now = new Date();
      const start = new Date(election.start_time);
      const end = new Date(election.end_time);

      if (now < start) {
        setStatus('pending');
        setTimeLeft('Starts ' + start.toLocaleString());
      } else if (now > end) {
        setStatus('ended');
        setTimeLeft('Ended ' + end.toLocaleString());
      } else {
        setStatus('active');
        const diff = end - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`Ends in: ${h}h ${m}m ${s}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [election]);

  return (
    <div className="glass-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem' }}>{election.title}</h3>
        <span style={{ 
          padding: '4px 8px', 
          borderRadius: '12px', 
          fontSize: '0.75rem',
          fontWeight: 'bold',
          backgroundColor: status === 'active' ? 'rgba(0,255,0,0.1)' : status === 'pending' ? 'rgba(255,165,0,0.1)' : status === 'draft' ? 'rgba(148,163,184,0.2)' : 'rgba(255,0,0,0.1)',
          color: status === 'active' ? '#4ade80' : status === 'pending' ? '#fbbf24' : status === 'draft' ? '#94a3b8' : '#f87171'
        }}>
          {status.toUpperCase()}
        </span>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', flex: 1 }}>
        {timeLeft}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
          Code: {election.election_code}
        </span>
        <button 
          className="btn btn-danger action-btn" 
          style={{ margin: 0, padding: '0.4rem 0.8rem' }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default ElectionsList;
