import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function ReviewerDashboard({ user, currentTab, setCurrentTab }) {
  const [proposals, setProposals] = useState([]);
  const [historyReviews, setHistoryReviews] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Scoring states
  const [feasibilityScore, setFeasibilityScore] = useState(5);
  const [strategicScore, setStrategicScore] = useState(5);
  const [riskScore, setRiskScore] = useState(5);
  const [roiScore, setRoiScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchQueueAndHistory = async () => {
    try {
      const allProposals = await api.get('/proposals');
      
      // Filter proposals that are Submitted or UnderReview (meaning they need a review!)
      const queue = allProposals.filter(p => p.status === 'Submitted' || p.status === 'UnderReview');
      setProposals(queue);

      // Fetch user's review history if they have reviews (we can fetch this via props or route)
      // For now, let's load all reviews and see if they belong to this reviewer, or fetch all reviews for proposal
      // Let's query reviewer history. Our endpoint is /reviews/reviewer/{reviewerId} or similar? 
      // Actually we have a GetByReviewerIdAsync(reviewerId) in ReviewRepository but didn't make a direct endpoint. 
      // No worries! We can just fetch proposals that are Reviewed, Approved, Rejected, FundAllocated. 
      // Reviewers can see their evaluations by looking at Reviewed items. Let's make it easy:
      const reviewedItems = allProposals.filter(p => p.status !== 'Draft' && p.status !== 'Submitted' && p.status !== 'UnderReview');
      setHistoryReviews(reviewedItems);
    } catch (err) {
      console.error('Error fetching reviewer queue', err);
    }
  };

  useEffect(() => {
    fetchQueueAndHistory();
    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchQueueAndHistory();
    });
    return () => unsubscribe();
  }, []);

  const handleSelectProposal = (proposal) => {
    setSelectedProposal(proposal);
    // Reset scoring form
    setFeasibilityScore(5);
    setStrategicScore(5);
    setRiskScore(5);
    setRoiScore(5);
    setComment('');
    setFormError('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setFormError('Please provide evaluation feedback comment.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await api.post('/reviews', {
        proposalId: selectedProposal.id,
        feasibilityScore: parseInt(feasibilityScore),
        strategicScore: parseInt(strategicScore),
        riskScore: parseInt(riskScore),
        roiScore: parseInt(roiScore),
        comment: comment
      });

      setSelectedProposal(null);
      fetchQueueAndHistory();
    } catch (err) {
      setFormError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Draft': return 'badge-draft';
      case 'Submitted': return 'badge-submitted';
      case 'UnderReview': return 'badge-underreview';
      case 'Reviewed': return 'badge-reviewed';
      case 'Approved': return 'badge-approved';
      case 'Rejected': return 'badge-rejected';
      case 'FundAllocated': return 'badge-fundallocated';
      default: return '';
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-columns">
        {/* Left Column: Review Queue & History */}
        <div>
          <div className="table-card">
            <div className="card-header">
              <h3>Pending Evaluation Queue</h3>
            </div>
            {proposals.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No proposals currently awaiting review.
              </p>
            ) : (
              <table className="governance-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((prop) => (
                    <tr key={prop.id} onClick={() => handleSelectProposal(prop)} style={{ cursor: 'pointer', background: selectedProposal?.id === prop.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ fontWeight: '500' }}>
                        {prop.title}
                        {prop.submitter?.patentVerificationStatus === 'Verified' && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--accent-secondary)' }} title="Submitted by a Verified Inventor">🛡️</span>
                        )}
                      </td>
                      <td>{prop.department}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{prop.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(prop.status)}`}>{prop.status}</span>
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleSelectProposal(prop); }}>
                          Evaluate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-card">
            <div className="card-header">
              <h3>Evaluated Proposals Archive</h3>
            </div>
            {historyReviews.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No completed reviews in archive.
              </p>
            ) : (
              <table className="governance-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Requested</th>
                    <th>Decision Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyReviews.map((prop) => (
                    <tr key={prop.id}>
                      <td style={{ fontWeight: '500' }}>{prop.title}</td>
                      <td>{prop.department}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{prop.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(prop.status)}`}>{prop.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Scoring Form & Details */}
        <div>
          {selectedProposal ? (
            <div className="detail-card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="flex-between mb-1" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <span className="badge badge-submitted">Reviewing</span>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setSelectedProposal(null)}>
                  Cancel
                </button>
              </div>

              <div className="detail-section">
                {selectedProposal.startupName && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '0.2rem 0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(165,180,252,0.9)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 {selectedProposal.startupName}</span>
                  </div>
                )}
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem', fontWeight: '600' }}>{selectedProposal.title}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '0.2rem 0 0.6rem 0' }}>
                  <span>Founder: <b>{selectedProposal.submitter?.fullName || `ID ${selectedProposal.submitterId}`}</b></span>
                  {selectedProposal.submitter?.patentVerificationStatus === 'Verified' && (
                    <span
                      className="badge badge-approved"
                      style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      title="Click to view Patent registry credentials"
                      onClick={() => {
                        try {
                          const details = JSON.parse(selectedProposal.submitter.patentDetailsJson);
                          alert(`🛡️ Verified Patent Details\n\nID: ${selectedProposal.submitter.patentId}\nTitle: ${details.Title}\nInventors: ${details.Inventors}\nDate: ${details.IssueDate}\n\nAbstract: ${details.Abstract}`);
                        } catch(e) {
                          alert(`Patent ID: ${selectedProposal.submitter.patentId} (Verified)`);
                        }
                      }}
                    >
                      🛡️ Verified Inventor
                    </span>
                  )}
                  <span>| Dept: {selectedProposal.department}</span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{selectedProposal.description}</p>

                {/* Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Funding Ask</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedProposal.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                  </div>
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Equity Offered</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.9)' }}>{selectedProposal.equityOffered != null ? `${selectedProposal.equityOffered}%` : '—'}</div>
                  </div>
                </div>

                {/* Problem & Solution */}
                {(selectedProposal.problemStatement || selectedProposal.proposedStatement) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    {selectedProposal.problemStatement && (
                      <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '8px', padding: '0.7rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>⚠️ Problem</div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.problemStatement}</p>
                      </div>
                    )}
                    {selectedProposal.proposedStatement && (
                      <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '8px', padding: '0.7rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>✅ Solution</div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.proposedStatement}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Team & Business Model */}
                {(selectedProposal.teamDetails || selectedProposal.businessModel) && (
                  <div style={{ display: 'grid', gridTemplateColumns: selectedProposal.businessModel ? '1fr 1fr' : '1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    {selectedProposal.teamDetails && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.7rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>👥 Team</div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.teamDetails}</p>
                      </div>
                    )}
                    {selectedProposal.businessModel && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.7rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>💼 Biz Model</div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.businessModel}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Demo Video / Doc */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  {selectedProposal.demoVideoUrl && (
                    <a href={selectedProposal.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.4rem 0.5rem', minWidth: '100px' }}>
                      🎬 Demo Video
                    </a>
                  )}
                  {selectedProposal.supportingDocumentPath && (
                    <a href={api.downloadUrl(selectedProposal.supportingDocumentPath)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.4rem 0.5rem', minWidth: '100px' }}>
                      📄 Document
                    </a>
                  )}
                </div>
              </div>

              {/* Scoring Form */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Governance Criteria Scoring (1-10)</h4>
                {formError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{formError}</p>}
                
                <form onSubmit={handleReviewSubmit}>
                  <div className="form-group">
                    <div className="flex-between">
                      <label style={{ fontSize: '0.75rem' }}>Technical Feasibility</label>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{feasibilityScore}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      className="form-input" style={{ padding: '0', cursor: 'pointer' }}
                      value={feasibilityScore} onChange={(e) => setFeasibilityScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div className="flex-between">
                      <label style={{ fontSize: '0.75rem' }}>Strategic Alignment</label>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{strategicScore}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      className="form-input" style={{ padding: '0', cursor: 'pointer' }}
                      value={strategicScore} onChange={(e) => setStrategicScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div className="flex-between">
                      <label style={{ fontSize: '0.75rem' }}>Risk Mitigation Index</label>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{riskScore}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      className="form-input" style={{ padding: '0', cursor: 'pointer' }}
                      value={riskScore} onChange={(e) => setRiskScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div className="flex-between">
                      <label style={{ fontSize: '0.75rem' }}>Projected Financial ROI</label>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{roiScore}/10</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      className="form-input" style={{ padding: '0', cursor: 'pointer' }}
                      value={roiScore} onChange={(e) => setRoiScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Commentary & Justification</label>
                    <textarea
                      className="form-textarea"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Outline technical reasons or capital constraints that justify your scoring criteria..."
                      rows="3"
                    />
                  </div>

                  <button type="submit" className="btn btn-success btn-full" disabled={submitting}>
                    {submitting ? 'Submitting Review...' : 'Submit Evaluation & Scores'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="detail-card text-center" style={{ padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--border-hover)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>Select a proposal from the queue to start evaluating project feasibility, strategic alignment, and submit scores.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
