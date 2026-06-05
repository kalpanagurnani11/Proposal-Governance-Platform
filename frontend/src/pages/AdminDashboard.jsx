import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';
import EmailMockViewer from '../components/EmailMockViewer';

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
    const freshProp = proposals.find(p => p.Id === proposal.Id) || proposal;
    setSelectedProposal(freshProp);
    setReviews([]);
    setCapitalAllocation(null);

    try {
      if (freshProp.Status !== 'Draft' && freshProp.Status !== 'Submitted') {
        const revData = await api.get(`/reviews/proposal/${freshProp.id}`);
        setReviews(revData);
      }

      if (freshProp.Status === 'FundAllocated' || freshProp.Status === 'Approved') {
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
      await api.post(`/proposals/${selectedProposal.Id}/assign-reviewer`, {
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
      await api.post(`/proposals/${selectedProposal.Id}/decide`, {
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

  const handleAllocateFunds = async () => {
    try {
      await api.post('/capital/allocate', {
        proposalId: selectedProposal.Id
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Capital allocation failed.');
    }
  };

  const triggerAiAnalysis = async () => {
    setAiLoading(true);
    setAiReport(null);
    setShowAiModal(true);
    try {
      const data = await api.post(`/proposals/${selectedProposal.Id}/analyze`);
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
                      <td style={{ fontWeight: '500' }}>{prop.Title}</td>
                      <td>{prop.Department}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{prop.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(prop.Status)}`}>{prop.Status}</span>
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
                  <span className={`badge ${getStatusBadgeClass(selectedProposal.Status)}`}>{selectedProposal.Status}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setSelectedProposal(null)}>
                    Clear Selection
                  </button>
                </div>

                <div className="detail-section">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '600' }}>{selectedProposal.Title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Submitted by: {selectedProposal.Submitter?.FullName} | Dept: {selectedProposal.Department}
                  </p>
                  <h4 style={{ marginTop: '1rem' }}>Description</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedProposal.Description}</p>
                </div>

                <div className="detail-section flex-between">
                  <div>
                    <h4>Requested Capital</h4>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {selectedProposal.RequestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                  {selectedProposal.ApprovedAmount > 0 && (
                    <div>
                      <h4>Approved Capital</h4>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>
                        {selectedProposal.ApprovedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                  )}
                </div>

                {selectedProposal.SupportingDocumentPath && (
                  <div className="detail-section">
                    <h4>Supporting Document</h4>
                    <a
                      href={api.downloadUrl(selectedProposal.SupportingDocumentPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '100%', justifyContent: 'center' }}
                    >
                      Open Attached PDF/Doc
                    </a>
                  </div>
                )}

                {/* Workflow Buttons */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* 1. Assign Reviewer */}
                  {(selectedProposal.Status === 'Submitted' || selectedProposal.Status === 'UnderReview') && (
                    <button className="btn btn-primary" onClick={() => setShowAssignModal(true)}>
                      Assign Governance Reviewer
                    </button>
                  )}

                  {/* 2. Governance Decision */}
                  {(selectedProposal.Status === 'Reviewed' || selectedProposal.Status === 'UnderReview') && (
                    <button className="btn btn-success" onClick={() => {
                      setApprovedAmount(selectedProposal.RequestedAmount.toString());
                      setShowDecisionModal(true);
                    }}>
                      Submit Final Approval Decision
                    </button>
                  )}

                  {/* 3. Allocate Capital */}
                  {selectedProposal.Status === 'Approved' && (
                    <button className="btn btn-success" onClick={handleAllocateFunds}>
                      Allocate Capital & Activate Pool
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
                      <div key={rev.Id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                        <div className="flex-between mb-1" style={{ fontSize: '0.85rem' }}>
                          <strong>{rev.Reviewer?.FullName}</strong>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                            Avg: {((rev.FeasibilityScore + rev.StrategicScore + rev.RiskScore + rev.RoiScore) / 4).toFixed(1)}/10
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <div>Feasibility: {rev.FeasibilityScore}/10</div>
                          <div>Strategic: {rev.StrategicScore}/10</div>
                          <div>Risk Index: {rev.RiskScore}/10</div>
                          <div>ROI Score: {rev.RoiScore}/10</div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                          "{rev.Comment}"
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
                  Submit the final governing committee outcome for <strong>'{selectedProposal?.Title}'</strong> (Requested: {selectedProposal?.RequestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}).
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
      {showAiModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>AI Decision Analysis</h3>
              <button className="modal-close" onClick={() => setShowAiModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {aiLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(6,182,212,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
                  <p>Processing natural language models and strategic vectors...</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : aiReport ? (
                <div className="ai-report" style={{ animation: 'fadeIn 0.25s' }}>
                  <div className="flex-between">
                    <span className={`ai-recommendation-badge ${
                      aiReport.Recommendation === 'Approve' ? 'ai-rec-approve' : 
                      aiReport.Recommendation === 'Conditional Approve' ? 'ai-rec-conditional' : 
                      'ai-rec-reject'
                    }`}>
                      Recommendation: {aiReport.Recommendation}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suggested Budget</span>
                      <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        {aiReport.SuggestedBudget?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </h4>
                    </div>
                  </div>

                  <div className="ai-analysis-block">
                    <h4>Executive Summary</h4>
                    <p>{aiReport.Summary}</p>
                  </div>

                  <div className="ai-scores-grid">
                    <div className="ai-score-bar-group">
                      <div className="ai-score-label">
                        <span>Technical Feasibility</span>
                        <span>{aiReport.FeasibilityScore}/10</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${aiReport.FeasibilityScore * 10}%`, backgroundColor: 'var(--accent-primary)' }}></div>
                      </div>
                    </div>

                    <div className="ai-score-bar-group">
                      <div className="ai-score-label">
                        <span>Strategic Alignment</span>
                        <span>{aiReport.StrategicScore}/10</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${aiReport.StrategicScore * 10}%`, backgroundColor: 'var(--accent-secondary)' }}></div>
                      </div>
                    </div>

                    <div className="ai-score-bar-group">
                      <div className="ai-score-label">
                        <span>Risk Index (Higher is Safer)</span>
                        <span>{aiReport.RiskScore}/10</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${aiReport.RiskScore * 10}%`, backgroundColor: 'var(--color-rejected)' }}></div>
                      </div>
                    </div>

                    <div className="ai-score-bar-group">
                      <div className="ai-score-label">
                        <span>ROI Potential</span>
                        <span>{aiReport.RoiScore}/10</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${aiReport.RoiScore * 10}%`, backgroundColor: 'var(--accent-cyan)' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="ai-analysis-block" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <h4>Risk Factor Profile</h4>
                    <p>{aiReport.RiskAssessment}</p>
                  </div>

                  <div className="ai-analysis-block">
                    <h4>Financial Yield Analysis</h4>
                    <p>{aiReport.RoiAnalysis}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-rejected)' }}>Failed to load analysis.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAiModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
