import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';
import EmailMockViewer from '../components/EmailMockViewer';
import AiReportModal from '../components/AiReportModal';



export default function AdminDashboard() {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [capitalAllocation, setCapitalAllocation] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decision, setDecision] = useState('approve');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [capitalSummary, setCapitalSummary] = useState(null);

  // Tab state within Admin: 'proposals' or 'emails'
  const [adminTab, setAdminTab] = useState('proposals');

 const fetchDashboardData = async () => {
  try {
    const allProps = await api.get('/proposals');
    console.log("PROPOSALS:", allProps);

    setProposals(Array.isArray(allProps) ? allProps : []);

    const capSummary = await api.get('/capital/summary');
    console.log("CAPITAL SUMMARY:", capSummary);

    setCapitalSummary(capSummary || {});
  } catch (err) {
    console.error('Error fetching admin data', err);

    setProposals([]);
    setCapitalSummary({});
  }
};

  useEffect(() => {
    fetchDashboardData();

    // Fetch potential reviewers
    const loadReviewers = async () => {
      // For demo, we know reviewer IDs 2 and 3 exist as Sarah Jenkins and David Vance
      setReviewers([
        { id: 2, fullName: 'Sarah Jenkins (Engineering)' },
        { id: 3, fullName: 'David Vance (Operations)' }
      ]);
    };
    loadReviewers();

    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchDashboardData();
      if (selectedProposal) {
        handleViewProposal(selectedProposal);
      }
    });

    return () => unsubscribe();
  }, [selectedProposal]);

  const handleViewProposal = async (proposal) => {
    // Refresh basic details in case status changed
    const freshProp = proposals.find(p => p.id === proposal.id) || proposal;
    setSelectedProposal(freshProp);
    setReviews([]);
    setCapitalAllocation(null);

    try {
      if (freshProp.status !== 'Draft' && freshProp.status !== 'Submitted') {
        const revData = await api.get(`/reviews/proposal/${freshProp.id}`);
        setReviews(revData);
      }

      if (freshProp.status === 'FundAllocated' || freshProp.status === 'Approved') {
        const capData = await api.get(`/capital/proposal/${freshProp.id}`).catch(() => null);
        setCapitalAllocation(capData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignReviewer = async () => {
    if (!selectedReviewerId) return;
    try {
      await api.post(`/proposals/${selectedProposal.id}/assign-reviewer`, {
        reviewerId: parseInt(selectedReviewerId)
      });
      setShowAssignModal(false);
      setSelectedReviewerId('');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (decision === 'approve' && (!approvedAmount || parseFloat(approvedAmount) <= 0)) {
      setDecisionError('Please enter a valid approved amount.');
      return;
    }

    setDecisionError('');

    try {
      await api.post(`/proposals/${selectedProposal.id}/decide`, {
        decision,
        approvedAmount: decision === 'approve' ? parseFloat(approvedAmount) : 0
      });
      setShowDecisionModal(false);
      setApprovedAmount('');
      fetchDashboardData();
    } catch (err) {
      setDecisionError(err.message || 'Governance decision failed.');
    }
  };

  const triggerAiAnalysis = async () => {
    setAiLoading(true);
    setAiReport(null);
    setShowAiModal(true);
    try {
      const data = await api.post(`/proposals/${selectedProposal.id}/analyze`);
      setAiReport(data);
    } catch (err) {
      console.error(err);
      setAiReport({ error: 'AI engine offline.' });
    } finally {
      setAiLoading(false);
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
      {/* Capital Summary Header Info Cards */}
      {capitalSummary && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">Capital Pool Size</div>
            <div className="metric-value">{capitalSummary.totalPool.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
            <div className="metric-footer">Total authorized capital</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-header">Allocated Budget</div>
            <div className="metric-value">{capitalSummary.allocated.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
            <div className="metric-footer">{Math.round((capitalSummary.allocated / capitalSummary.totalPool) * 100)}% committed</div>
          </div>
          <div className="metric-card emerald">
            <div className="metric-header">Capital Remaining</div>
            <div className="metric-value">{capitalSummary.remaining.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
            <div className="metric-footer">Available for approvals</div>
          </div>
          <div className="metric-card cyan">
            <div className="metric-header font-mono">Disbursed Expenses</div>
            <div className="metric-value">{capitalSummary.disbursed.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
            <div className="metric-footer">{Math.round((capitalSummary.disbursed / (capitalSummary.allocated || 1)) * 100)}% drawdown utilization</div>
          </div>
        </div>
      )}

      {/* Admin Nav SubTabs */}
      <div className="tab-container">
        <button className={`tab-btn ${adminTab === 'proposals' ? 'active' : ''}`} onClick={() => setAdminTab('proposals')}>
          Governance Proposals
        </button>
        <button className={`tab-btn ${adminTab === 'emails' ? 'active' : ''}`} onClick={() => setAdminTab('emails')}>
          Dispatched Mail Audits
        </button>
      </div>

      {adminTab === 'emails' && <EmailMockViewer />}

      {adminTab === 'proposals' && (
        <div className="dashboard-columns">
          {/* Left Pane: All Proposals */}
          <div>
            <div className="table-card">
              <div className="card-header">
                <h3>All Organization Proposals</h3>
              </div>
              <table className="governance-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Dept</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((prop) => (
                    <tr key={prop.id} onClick={() => handleViewProposal(prop)} style={{ cursor: 'pointer', background: selectedProposal?.id === prop.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
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
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleViewProposal(prop); }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Pane: Admin Details & Decisions */}
          <div>
            {selectedProposal ? (
              <div className="detail-card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="flex-between mb-1" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <span className={`badge ${getStatusBadgeClass(selectedProposal.status)}`}>{selectedProposal.status}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setSelectedProposal(null)}>
                    Clear Selection
                  </button>
                </div>

                <div className="detail-section">
                  {selectedProposal.startupName && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '0.2rem 0.75rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(165,180,252,0.9)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 {selectedProposal.startupName}</span>
                    </div>
                  )}
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', fontWeight: '600' }}>{selectedProposal.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                    <span>Submitted by: <b>{selectedProposal.submitter?.fullName}</b></span>
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
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{selectedProposal.description}</p>
                </div>

                {/* Key Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Funding Ask</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedProposal.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                  </div>
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Equity</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.9)' }}>{selectedProposal.equityOffered != null ? `${selectedProposal.equityOffered}%` : '—'}</div>
                  </div>
                  {selectedProposal.approvedAmount > 0 ? (
                    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Approved</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{selectedProposal.approvedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Status</div>
                      <span className={`badge ${getStatusBadgeClass(selectedProposal.status)}`} style={{ fontSize: '0.68rem' }}>{selectedProposal.status}</span>
                    </div>
                  )}
                </div>

                {/* Problem & Solution */}
                {(selectedProposal.problemStatement || selectedProposal.proposedStatement) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    {selectedProposal.problemStatement && (
                      <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.3rem' }}>⚠️ Problem</div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.problemStatement}</p>
                      </div>
                    )}
                    {selectedProposal.proposedStatement && (
                      <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.3rem' }}>✅ Solution</div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.proposedStatement}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Team & Business Model */}
                {(selectedProposal.teamDetails || selectedProposal.businessModel) && (
                  <div style={{ display: 'grid', gridTemplateColumns: selectedProposal.businessModel ? '1fr 1fr' : '1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    {selectedProposal.teamDetails && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.3rem' }}>👥 Team</div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.teamDetails}</p>
                      </div>
                    )}
                    {selectedProposal.businessModel && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.3rem' }}>💼 Business Model</div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.businessModel}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Demo Video & Supporting Doc row */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedProposal.demoVideoUrl && (
                    <a href={selectedProposal.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '0.4rem 0.6rem', minWidth: '120px' }}>
                      🎬 Demo Video
                    </a>
                  )}
                  {selectedProposal.supportingDocumentPath && (
                    <a href={api.downloadUrl(selectedProposal.supportingDocumentPath)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '0.4rem 0.6rem', minWidth: '120px' }}>
                      📄 Open Document
                    </a>
                  )}
                </div>

                {/* Workflow Buttons */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* 1. Assign Reviewer */}
                  {(selectedProposal.status === 'Submitted' || selectedProposal.status === 'UnderReview') && (
                    <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}>
                      Assign Governance Reviewer
                    </button>
                  )}

                  {/* 2. Governance Decision */}
                  {(selectedProposal.status === 'Reviewed' || selectedProposal.status === 'UnderReview') && (
                    <button className="btn btn-success" onClick={() => {
                      setApprovedAmount(selectedProposal.requestedAmount.toString());
                      setShowDecisionModal(true);
                    }}>
                      Submit Final Approval Decision
                    </button>
                  )}


                  {/* AI assistant trigger */}
                  <button
                    className="btn btn-secondary"
                    onClick={triggerAiAnalysis}
                    style={{
                      border: '1px solid rgba(6,182,212,0.3)',
                      color: 'var(--accent-cyan)',
                      background: 'rgba(6,182,212,0.05)',
                      justifyContent: 'center'
                    }}
                  >
                    AI Decision Analysis
                  </button>
                </div>

                {/* Reviewer scoring section */}
                {reviews.length > 0 && (
                  <div className="detail-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Reviewer Evaluations ({reviews.length})</h4>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                        <div className="flex-between mb-1" style={{ fontSize: '0.85rem' }}>
                          <strong>{rev.reviewer?.fullName}</strong>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                            Avg: {((rev.feasibilityScore + rev.strategicScore + rev.riskScore + rev.roiScore) / 4).toFixed(1)}/10
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <div>Feasibility: {rev.feasibilityScore}/10</div>
                          <div>Strategic: {rev.strategicScore}/10</div>
                          <div>Risk Index: {rev.riskScore}/10</div>
                          <div>ROI Score: {rev.roiScore}/10</div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                          "{rev.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="detail-card text-center" style={{ padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--border-hover)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>Select an active proposal from the organization database to assign reviewers, view analytical scores, or commit capital allocations.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. ASSIGN REVIEWER MODAL */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assign Governance Reviewer</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Select an expert reviewer to evaluate <strong>'{selectedProposal?.Title}'</strong>.
              </p>
              <div className="form-group">
                <label>Reviewer Account</label>
                <select className="form-select" value={selectedReviewerId} onChange={(e) => setSelectedReviewerId(e.target.value)}>
                  <option value="">Select a reviewer...</option>
                  {reviewers.map(r => (
                    <option key={r.id} value={r.id}>{r.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignReviewer} disabled={!selectedReviewerId}>Assign Reviewer</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DECISION MODAL */}
      {showDecisionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Governance Committee Decision</h3>
              <button className="modal-close" onClick={() => setShowDecisionModal(false)}>×</button>
            </div>
            <form onSubmit={handleDecisionSubmit}>
              <div className="modal-body">
                {decisionError && <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-rejected)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{decisionError}</div>}
                
                <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Submit the final governing committee outcome for <strong>'{selectedProposal?.title}'</strong> (Requested: {selectedProposal?.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}).
                </p>

                <div className="form-group">
                  <label>Outcome Decision</label>
                  <select className="form-select" value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="approve">Approve Proposal</option>
                    <option value="reject">Reject Proposal</option>
                  </select>
                </div>

                {decision === 'approve' && (
                  <div className="form-group">
                    <label>Approved Budget Allocation ($)</label>
                    <input
                      type="number" step="0.01" className="form-input"
                      value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)}
                      placeholder="Amount ($)"
                    />
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Recommended: Do not exceed the requested value.
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDecisionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Submit Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. AI REPORT MODAL */}
      {showAiModal && <AiReportModal report={aiReport} loading={aiLoading} onClose={() => setShowAiModal(false)} />}
    </div>
  );
}


