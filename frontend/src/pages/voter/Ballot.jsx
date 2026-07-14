import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBallot, submitVote, getElectionByCode } from '../../api';

function Ballot() {
  const { code } = useParams();
  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [electionTitle, setElectionTitle] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const navigate = useNavigate();

  const voterId = sessionStorage.getItem('voterId');
  const voterName = sessionStorage.getItem('voterName');

  useEffect(() => {
    if (!voterId) {
      navigate(`/vote/${code}`, { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        const [ballotRes, electionRes] = await Promise.all([
          getBallot(code),
          getElectionByCode(code),
        ]);
        setPositions(ballotRes.data);
        setElectionTitle(electionRes.data.title);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load ballot');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [voterId, code, navigate]);

  const handleSelect = (positionId, candidateId) => {
    setSelections(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const allSelected = positions.length > 0 && positions.every(p => selections[p._id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const votes = Object.entries(selections).map(([positionId, candidateId]) => ({
        positionId,
        candidateId,
      }));
      await submitVote(code, voterId, votes);
      navigate(`/vote/${code}/success`, { state: { voterName }, replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit votes');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span className="loader" style={{ width: '32px', height: '32px' }}></span>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>{electionTitle || 'Cast Your Vote'}</h1>
        <p>Welcome, <strong style={{ color: 'var(--primary-color)', textTransform: 'capitalize' }}>{voterName}</strong>. Select one candidate for each category below.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {positions.map((position, idx) => (
        <div className="position-section" key={position._id}>
          <div className="position-title">
            <h2 style={{ marginBottom: 0 }}>{position.title}</h2>
            <span style={{ color: selections[position._id] ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              {selections[position._id] ? '✓ Selected' : `${idx + 1} of ${positions.length}`}
            </span>
          </div>

          <div className="candidates-grid">
            {position.candidates.map(candidate => {
              const isSelected = selections[position._id] === candidate._id;
              return (
                <div
                  key={candidate._id}
                  className={`candidate-card${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelect(position._id, candidate._id)}
                >
                  <div className="selection-indicator"></div>
                  {candidate.image_url ? (
                    <img
                      src={candidate.image_url}
                      alt={candidate.name}
                      className="candidate-img"
                      onClick={(e) => { e.stopPropagation(); setZoomedImage(candidate.image_url); }}
                    />
                  ) : (
                    <div className="candidate-img" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      color: 'var(--text-muted)',
                      background: 'var(--secondary-surface)',
                    }}>
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{candidate.name}</h3>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ position: 'sticky', bottom: '1rem', marginTop: '2rem', zIndex: 5 }}>
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {Object.keys(selections).length} of {positions.length} categories selected
          </span>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
            disabled={!allSelected || submitting}
            onClick={() => setShowConfirm(true)}
          >
            Submit Ballot
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>Confirm Your Ballot</h2>
              {!submitting && <span className="close-modal" onClick={() => setShowConfirm(false)}>&times;</span>}
            </div>
            <p style={{ marginBottom: '1.5rem' }}>Please review your selections. Once submitted, your vote cannot be changed.</p>

            <div style={{ marginBottom: '1.5rem' }}>
              {positions.map(pos => {
                const selected = pos.candidates.find(c => c._id === selections[pos._id]);
                return (
                  <div key={pos._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{pos.title}</span>
                    <strong style={{ color: 'var(--primary-color)', textTransform: 'capitalize' }}>{selected?.name}</strong>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Go Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <><span className="loader" style={{ marginRight: '8px', width: '16px', height: '16px' }}></span> Submitting...</> : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', flexDirection: 'column' }} onClick={() => setZoomedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} alt="Full screen candidate" />
            <span className="close-modal" style={{ position: 'absolute', top: '-40px', right: 0, color: 'white', fontSize: '2.5rem', fontWeight: 300 }} onClick={() => setZoomedImage(null)}>&times;</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ballot;
