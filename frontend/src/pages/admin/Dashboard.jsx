import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import {
  adminCheck,
  adminLogout,
  getAdminStats,
  getElectionById,
  updateElection,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  deleteAllCandidates,
  getVoters,
  createVoter,
  createBulkVoters,
  deleteVoter,
  getAdmins,
  createAdmin,
  deleteAdmin,
} from '../../api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'voters', label: 'Voters' },
  { id: 'admins', label: 'Administrators' },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { electionId } = useParams();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await adminCheck();
        if (!res.data.authenticated) {
          navigate('/admin/login', { replace: true });
        }
      } catch {
        navigate('/admin/login', { replace: true });
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span className="loader" style={{ width: '32px', height: '32px' }}></span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary-color)' }}>Admin Panel</h2>
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--text-main)' }}
        >
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="glass-card" style={{ padding: '1.5rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)' }}>
              Admin Panel
            </h2>
            <button className="close-modal d-md-none" onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem', color: 'var(--text-main)' }}>
              &times;
            </button>
          </div>
          {TABS.map(tab => (
            <div
              key={tab.id}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
            >
              {tab.label}
            </div>
          ))}
          <div
            className="nav-item"
            onClick={() => navigate(`/admin/results?election_id=${electionId}`)}
          >
            View Results
          </div>
          <div
            className="nav-item"
            onClick={() => navigate('/admin/dashboard')}
            style={{ color: 'var(--primary-color)' }}
          >
            ← Back to Elections
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--danger)' }}
          >
            Logout
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && <OverviewTab electionId={electionId} />}
        {activeTab === 'positions' && <PositionsTab electionId={electionId} />}
        {activeTab === 'candidates' && <CandidatesTab electionId={electionId} />}
        {activeTab === 'voters' && <VotersTab electionId={electionId} />}
        {activeTab === 'admins' && <AdminsTab />}
      </main>
    </div>
  );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ electionId }) {
  const [stats, setStats] = useState(null);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [publishStart, setPublishStart] = useState('');
  const [publishEnd, setPublishEnd] = useState('');
  const [publishError, setPublishError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, electionRes] = await Promise.all([
        getAdminStats(electionId),
        getElectionById(electionId),
      ]);
      setStats(statsRes.data);
      setElection(electionRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [electionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!election) return;
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

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!publishStart || !publishEnd) return;
    setPublishError(null);
    try {
      await updateElection(electionId, {
        start_time: new Date(publishStart),
        end_time: new Date(publishEnd),
        is_published: true
      });
      setShowPublish(false);
      fetchData();
    } catch (err) {
      setPublishError(err.response?.data?.message || 'Failed to publish election');
    }
  };

  const copyLink = () => {
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    const link = `${baseUrl}/vote/${election.election_code}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="loader" style={{ width: '28px', height: '28px' }}></span></div>;
  }

  const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const voterLink = `${baseUrl}/vote/${election?.election_code}`;

  return (
    <div>
      <h2>Election Overview: {election?.title}</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Voters" value={stats?.totalVoters || 0} />
        <StatCard label="Votes Cast" value={stats?.votedCount || 0} />
        <StatCard label="Turnout" value={`${stats?.turnout || 0}%`} accent />
      </div>

      {/* Election Status */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Status: {status.toUpperCase()}</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {timeLeft}
          </p>
        </div>
        {!election?.is_published ? (
          <button className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} onClick={() => setShowPublish(true)}>
            Publish Election
          </button>
        ) : (
          <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px' }}>
            Code: {election?.election_code}
          </span>
        )}
      </div>

      {/* Election Link */}
      <div className="glass-card" style={{ opacity: election?.is_published ? 1 : 0.5, pointerEvents: election?.is_published ? 'auto' : 'none' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Shareable Voter Link</h3>
        <p style={{ marginBottom: '1rem' }}>
          {election?.is_published ? 'Share this link with voters so they can access the ballot.' : 'Publish the election to generate an active shareable link.'}
        </p>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'stretch',
        }}>
          <input
            type="text"
            value={voterLink}
            readOnly
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.3)',
              fontSize: '0.9rem',
              cursor: 'text',
            }}
            onClick={e => election?.is_published && e.target.select()}
          />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 1.25rem', whiteSpace: 'nowrap' }} onClick={copyLink} disabled={!election?.is_published}>
            {linkCopied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Publish Modal */}
      {showPublish && (
        <div className="modal-overlay" onClick={() => setShowPublish(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Publish Election</h2>
              <span className="close-modal" onClick={() => setShowPublish(false)}>&times;</span>
            </div>
            {publishError && <div className="alert alert-error">{publishError}</div>}
            <form onSubmit={handlePublish}>
              <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Set the opening window for this election. Voters will only be able to access the ballot between these times.</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Start Time
                  </label>
                  <input 
                    type="datetime-local" 
                    value={publishStart} 
                    onChange={(e) => setPublishStart(e.target.value)} 
                    required 
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      width: '100%',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    End Time
                  </label>
                  <input 
                    type="datetime-local" 
                    value={publishEnd} 
                    onChange={(e) => setPublishEnd(e.target.value)} 
                    required 
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      width: '100%',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPublish(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
      <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: accent ? 'var(--primary-color)' : 'var(--text-main)',
        margin: 0,
      }}>{value}</p>
    </div>
  );
}

/* ==================== POSITIONS TAB ==================== */
function PositionsTab({ electionId }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState('');
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await getPositions(electionId);
      setPositions(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [electionId]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await createPosition({ election_id: electionId, title: title.trim(), order: Number(order) || 0 });
      setTitle('');
      setOrder('');
      setShowCreate(false);
      fetchPositions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create position');
    }
  };

  const handleUpdate = async (id) => {
    setError(null);
    try {
      await updatePosition(id, { title: editTitle.trim(), order: Number(editOrder) || 0 });
      setEditId(null);
      fetchPositions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update position');
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePosition(deleteId);
      setDeleteId(null);
      fetchPositions();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="loader" style={{ width: '28px', height: '28px' }}></span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'nowrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Award Categories</h2>
        <button className="btn btn-primary" style={{ width: 'auto', fontSize: '0.85rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowCreate(true)}>+ Add Category</button>
      </div>

      {error && !showCreate && <div className="alert alert-error">{error}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Add Category</h2>
              <span className="close-modal" onClick={() => setShowCreate(false)}>&times;</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Category title (e.g., Best Dressed)</label>
                <input
                  type="text"
                  placeholder="Category title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Order (optional)</label>
                <input
                  type="number"
                  placeholder="Order"
                  value={order}
                  onChange={e => setOrder(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Positions list */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => (
              <tr key={pos._id}>
                <td>
                  {editId === pos._id ? (
                    <input type="number" value={editOrder} onChange={e => setEditOrder(e.target.value)} style={{ width: '60px' }} />
                  ) : (
                    pos.order
                  )}
                </td>
                <td>
                  {editId === pos._id ? (
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  ) : (
                    pos.title
                  )}
                </td>
                <td>
                  {editId === pos._id ? (
                    <>
                      <button className="btn btn-primary action-btn" onClick={() => handleUpdate(pos._id)}>Save</button>
                      <button className="btn btn-secondary action-btn" onClick={() => setEditId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary action-btn" onClick={() => { setEditId(pos._id); setEditTitle(pos.title); setEditOrder(pos.order); }}>Edit</button>
                      <button className="btn btn-danger action-btn" onClick={() => handleDelete(pos._id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {positions.length === 0 && (
              <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No categories yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Category"
        message="Are you sure you want to delete this category? All associated nominees will also be deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ==================== CANDIDATES TAB ==================== */
function CandidatesTab({ electionId }) {
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [positionId, setPositionId] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPositionId, setEditPositionId] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [candRes, posRes] = await Promise.all([getCandidates(electionId), getPositions(electionId)]);
      setCandidates(candRes.data);
      setPositions(posRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [electionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !positionId) return;
    setError(null);
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append('election_id', electionId);
      formData.append('name', name.trim());
      formData.append('position_id', positionId);
      if (image) formData.append('image', image);

      await createCandidate(formData);
      setName('');
      setPositionId('');
      setImage(null);
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create candidate');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCandidate(deleteId);
      setDeleteId(null);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleEditClick = (c) => {
    setEditId(c._id);
    setEditName(c.name);
    setEditPositionId(c.position_id?._id || '');
    setEditImage(null);
  };

  const handleUpdate = async (id) => {
    if (!editName.trim() || !editPositionId) return;
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('position_id', editPositionId);
      if (editImage) formData.append('image', editImage);
      
      await updateCandidate(id, formData);
      setEditId(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update candidate');
    }
  };

  const confirmDeleteAll = async () => {
    try {
      await deleteAllCandidates(electionId);
      setDeleteAllConfirm(false);
      fetchData();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="loader" style={{ width: '28px', height: '28px' }}></span></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'nowrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nominees</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ width: 'auto', fontSize: '0.85rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap' }} onClick={() => setShowCreate(true)}>+ Add</button>
          {candidates.length > 0 && (
            <button className="btn btn-danger" style={{ width: 'auto', fontSize: '0.85rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap' }} onClick={() => setDeleteAllConfirm(true)}>Delete All</button>
          )}
        </div>
      </div>

      {error && !showCreate && <div className="alert alert-error">{error}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Add Nominee</h2>
              <span className="close-modal" onClick={() => setShowCreate(false)}>&times;</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Candidate name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={positionId} onChange={e => setPositionId(e.target.value)} required>
                  <option value="">Select category…</option>
                  {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Photo (optional)</label>
                <ImageUploader image={image} setImage={setImage} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Adding…' : 'Add Nominee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidates table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => {
              const isEditing = editId === c._id;
              return (
                <tr key={c._id}>
                  <td>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--secondary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isEditing && (
                      <div style={{ marginTop: '0.5rem', width: '150px' }}>
                        <ImageUploader image={editImage} setImage={setEditImage} compact={true} />
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '0.25rem', width: '100%' }} />
                    ) : (
                      <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={editPositionId} onChange={e => setEditPositionId(e.target.value)} style={{ padding: '0.25rem', width: '100%' }}>
                        <option value="">Select category…</option>
                        {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                      </select>
                    ) : (
                      <span>{c.position_id?.title || '—'}</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <>
                        <button className="btn btn-primary action-btn" onClick={() => handleUpdate(c._id)}>Save</button>
                        <button className="btn btn-secondary action-btn" onClick={() => setEditId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary action-btn" onClick={() => handleEditClick(c)}>Edit</button>
                        <button className="btn btn-danger action-btn" onClick={() => handleDelete(c._id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {candidates.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No nominees yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Nominee"
        message="Are you sure you want to delete this nominee?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <ConfirmModal
        isOpen={deleteAllConfirm}
        title="Delete All Nominees"
        message="Are you sure you want to delete ALL nominees? This action cannot be undone."
        onConfirm={confirmDeleteAll}
        onCancel={() => setDeleteAllConfirm(false)}
      />
    </div>
  );
}

function ImageUploader({ image, setImage, compact = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
        borderRadius: '8px',
        padding: compact ? '0.5rem' : '1rem',
        textAlign: 'center',
        background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.1)',
        color: 'var(--text-muted)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: compact ? '50px' : '80px'
      }}
    >
      <input
        type="file"
        accept="image/*"
        onChange={e => setImage(e.target.files[0])}
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer'
        }}
      />
      {image ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)' }}>
          <span style={{ fontSize: '1rem' }}>✓</span>
          <span style={{ fontSize: compact ? '0.7rem' : '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: compact ? '110px' : '150px' }}>{image.name}</span>
        </div>
      ) : (
        <span style={{ fontSize: compact ? '0.75rem' : '0.85rem', lineHeight: '1.2' }}>
          {compact ? 'Drag or click' : <>Drag & drop image<br/>or click to browse</>}
        </span>
      )}
    </div>
  );
}

/* ==================== VOTERS TAB ==================== */
function VotersTab({ electionId }) {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleName, setSingleName] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchVoters = useCallback(async () => {
    try {
      const res = await getVoters(electionId);
      setVoters(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [electionId]);

  useEffect(() => { fetchVoters(); }, [fetchVoters]);

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await createVoter(electionId, singleName.trim());
      setSingleName('');
      setShowCreate(false);
      setSuccess('Voter added successfully');
      fetchVoters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add voter');
    }
  };

  const handleAddBulk = async (e) => {
    e.preventDefault();
    if (!bulkNames.trim()) return;
    setError(null);
    setSuccess(null);
    const names = bulkNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    try {
      const res = await createBulkVoters(electionId, names);
      setBulkNames('');
      setShowCreate(false);
      setSuccess(res.data.message);
      fetchVoters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add voters');
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteVoter(deleteId);
      setDeleteId(null);
      fetchVoters();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="loader" style={{ width: '28px', height: '28px' }}></span></div>;
  }

  const votedCount = voters.filter(v => v.has_voted).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'nowrap', gap: '0.5rem' }}>
        <div style={{ overflow: 'hidden' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Voter Registry</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {votedCount} of {voters.length} voted
          </span>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', fontSize: '0.85rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowCreate(true)}>+ Add Voters</button>
      </div>

      {error && !showCreate && <div className="alert alert-error">{error}</div>}
      {success && !showCreate && <div className="alert alert-success">{success}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Add Voters</h2>
              <span className="close-modal" onClick={() => setShowCreate(false)}>&times;</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Single Voter</h3>
              </div>
              <form onSubmit={handleAddSingle} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Enter voter's full name"
                  value={singleName}
                  onChange={e => setSingleName(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>Add</button>
              </form>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bulk Import</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => setShowBulk(!showBulk)}
                >
                  {showBulk ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showBulk && (
                <form onSubmit={handleAddBulk}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Paste names (one per line)</p>
                  <textarea
                    rows={6}
                    value={bulkNames}
                    onChange={e => setBulkNames(e.target.value)}
                    placeholder={"John Doe\nJane Smith\nAlex Johnson"}
                    style={{ marginBottom: '1rem' }}
                  ></textarea>
                  <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
                    Import All Voters
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voter table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Voted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voters.map(v => (
              <tr key={v._id}>
                <td style={{ textTransform: 'capitalize' }}>{v.full_name}</td>
                <td>
                  {v.has_voted ? (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Voted</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {v.voted_at ? new Date(v.voted_at).toLocaleString() : '—'}
                </td>
                <td>
                  <button className="btn btn-danger action-btn" onClick={() => handleDelete(v._id)} disabled={v.has_voted}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {voters.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No voters registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Voter"
        message="Are you sure you want to delete this voter? They will no longer be able to vote."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function AdminsTab() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await getAdmins();
      setAdmins(res.data);
    } catch (err) {
      setError('Failed to load administrators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    try {
      await createAdmin({ username: newUsername.trim(), password: newPassword });
      setNewUsername('');
      setNewPassword('');
      setShowCreate(false);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create administrator');
    }
  };

  const handleDelete = (id) => setDeleteId(id);
  const confirmDelete = async () => {
    try {
      await deleteAdmin(deleteId);
      setDeleteId(null);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete administrator');
      setDeleteId(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="loader" style={{ width: '28px', height: '28px' }}></span></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'nowrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Administrators</h2>
        <button className="btn btn-primary" style={{ width: 'auto', fontSize: '0.85rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowCreate(true)}>+ Add Admin</button>
      </div>
      
      {error && !showCreate && <div className="alert alert-error">{error}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Add Administrator</h2>
              <span className="close-modal" onClick={() => setShowCreate(false)}>&times;</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newUsername.trim() || !newPassword.trim()}>
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Created At</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin._id}>
                <td style={{ fontWeight: '500' }}>{admin.username}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {new Date(admin.createdAt).toLocaleString()}
                </td>
                <td>
                  <button className="btn btn-danger action-btn" onClick={() => handleDelete(admin._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Administrator"
        message="Are you sure you want to delete this administrator?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Dashboard;
