import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

function Success() {
  const { code } = useParams();
  const location = useLocation();
  const voterName = location.state?.voterName || 'Voter';

  useEffect(() => {
    // Clear all voter session data to prevent back-navigation
    sessionStorage.removeItem('voterId');
    sessionStorage.removeItem('voterName');

    // Prevent back navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="container auth-container">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '2px solid var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2.5rem',
        }}>
          ✓
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>Thank You!</h1>

        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Your vote has been recorded, <strong style={{ textTransform: 'capitalize' }}>{voterName}</strong>.
        </p>

        <p style={{ marginBottom: '2rem' }}>
          Your ballot has been securely submitted and recorded. You may now close this page.
        </p>

        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid var(--primary-color)',
          borderRadius: '8px',
          padding: '1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
        }}>
          For the integrity of the election, each voter may only vote once. Your selections are final and anonymous.
        </div>
      </div>
    </div>
  );
}

export default Success;
