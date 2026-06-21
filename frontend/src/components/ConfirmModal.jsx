import React from 'react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', isDanger = true, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={!isLoading ? onCancel : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '2rem' }}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: 0, fontSize: '1.25rem' }}>{title}</h2>
          {!isLoading && <span className="close-modal" onClick={onCancel}>&times;</span>}
        </div>
        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ width: 'auto' }} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm} 
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading && <span className="loader" style={{ width: '16px', height: '16px' }}></span>}
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
