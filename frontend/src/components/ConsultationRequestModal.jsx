import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ConsultationRequestModal({ user, userRole, onClose, onRequestSubmitted }) {
  const [consultationType, setConsultationType] = useState('Technical Feasibility Audit');
  const [startupId, setStartupId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isFounder = userRole === 'Founder';

  const consultationTypes = [
    'Technical Feasibility Audit',
    'Business Model Evaluation',
    'Pitch Deck Presentation Prep',
    'Regulatory & Compliance Advisory',
    'Capital Allocation & Financial Strategy'
  ];

  // Demo reviewers list matching the rest of the application
  const reviewersList = [
    { id: 2, fullName: 'Sarah Jenkins', specialization: 'Technical & Operations' },
    { id: 3, fullName: 'David Vance', specialization: 'Investment & Finance' }
  ];

  useEffect(() => {
    if (isFounder) {
      loadProposals();
    }
  }, []);

  const loadProposals = async () => {
    setLoadingProposals(true);
    try {
      const data = await api.get('/proposals');
      // Filter for submitted/reviewed proposals, or drafts
      setProposals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching proposals for modal', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Subject and Description are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      consultationType,
      subject: subject.trim(),
      description: description.trim(),
      reviewerId: reviewerId ? parseInt(reviewerId) : null,
      startupId: startupId ? parseInt(startupId) : null
    };

    try {
      await api.post('/consultation/request', payload);
      onRequestSubmitted();
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to submit consultation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ backdropFilter: 'blur(6px)' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '600px', 
          width: '95vw',
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xl)',
          animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📞 Request Expert Reviewer Consultation
          </h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-muted)', 
              cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              color: 'var(--color-rejected)', 
              padding: '0.75rem 1rem', 
              borderRadius: '6px', 
              marginBottom: '1.25rem',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Consultation Domain *</label>
              <select 
                className="form-input" 
                value={consultationType} 
                onChange={(e) => setConsultationType(e.target.value)}
                style={{ padding: '0.5rem', width: '100%', height: '38px' }}
              >
                {consultationTypes.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Preferred Expert Reviewer</label>
              <select 
                className="form-input" 
                value={reviewerId} 
                onChange={(e) => setReviewerId(e.target.value)}
                style={{ padding: '0.5rem', width: '100%', height: '38px' }}
              >
                <option value="">Any Available Reviewer</option>
                {reviewersList.map((r) => (
                  <option key={r.id} value={r.id}>{r.fullName} ({r.specialization})</option>
                ))}
              </select>
            </div>
          </div>

          {isFounder && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Link Startup Proposal (Optional)</label>
              <select 
                className="form-input" 
                value={startupId} 
                onChange={(e) => setStartupId(e.target.value)}
                disabled={loadingProposals}
                style={{ padding: '0.5rem', width: '100%', height: '38px' }}
              >
                <option value="">-- No Linked Proposal --</option>
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} [{p.status}]</option>
                ))}
              </select>
              {loadingProposals && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading proposals...</span>}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Consultation Subject *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="E.g. Financial model review / Feasibility query"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              style={{ width: '100%', height: '38px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Detailed Consultation Brief *</label>
            <textarea 
              className="form-textarea" 
              placeholder="Describe what specific guidance, advice, or evaluation feedback you need from the reviewer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={submitting}
              style={{ margin: 0 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting || !subject.trim() || !description.trim()}
              style={{ margin: 0, padding: '0.5rem 1.5rem' }}
            >
              {submitting ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
