import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';
import EmailMockViewer from '../components/EmailMockViewer';

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active || !text) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return displayed;
}

// ── Animated score bar component ─────────────────────────────────────────────
function AiScoreBar({ label, score, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score * 10), delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  const pct = score * 10;
  const barColor = pct >= 70 ? color : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="ai-score-bar-group">
      <div className="ai-score-label">
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700 }}>{score}<span style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>/10</span></span>
      </div>
      <div className="progress-container" style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: '99px',
            width: `${width}%`,
            background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
            boxShadow: `0 0 10px ${barColor}66`,
            transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}

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

  const handleAllocateFunds = async () => {
    try {
      await api.post('/capital/allocate', {
        proposalId: selectedProposal.id
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
                      <td style={{ fontWeight: '500' }}>{prop.title}</td>
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
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '600' }}>{selectedProposal.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Submitted by: {selectedProposal.submitter?.fullName} | Dept: {selectedProposal.department}
                  </p>
                  <h4 style={{ marginTop: '1rem' }}>Description</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedProposal.description}</p>
                </div>

                <div className="detail-section flex-between">
                  <div>
                    <h4>Requested Capital</h4>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {selectedProposal.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                  {selectedProposal.approvedAmount > 0 && (
                    <div>
                      <h4>Approved Capital</h4>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>
                        {selectedProposal.approvedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                  )}
                </div>

                {selectedProposal.supportingDocumentPath && (
                  <div className="detail-section">
                    <h4>Supporting Document</h4>
                    <a
                      href={api.downloadUrl(selectedProposal.supportingDocumentPath)}
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

                  {/* 3. Allocate Capital */}
                  {selectedProposal.status === 'Approved' && (
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

// ════════════════════════════════════════════════════════════════════════════
//  AI Report Modal — cinematic, animated, premium design
// ════════════════════════════════════════════════════════════════════════════
const LOADING_STEPS = [
  'Scanning proposal metadata…',
  'Vectorising semantic content…',
  'Running Monte-Carlo risk simulation…',
  'Calibrating financial yield model…',
  'Benchmarking against 2,400+ analogues…',
  'Generating recommendation matrix…',
  'Compiling executive report…',
];

function AiReportModal({ report, loading, onClose }) {
  const [loadingStep, setLoadingStep] = useState(0);
  const summaryText = useTypewriter(
    loading ? '' : (report?.summary ?? report?.Summary ?? ''),
    14,
    !loading
  );

  // Cycle through loading steps for visual effect
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
    }, 900);
    return () => clearInterval(id);
  }, [loading]);

  const rec  = report?.recommendation ?? report?.Recommendation;
  const recColor = rec === 'Approve' ? '#10b981' : rec === 'Conditional Approve' ? '#f59e0b' : '#ef4444';

  // Normalise both casing variants from backend
  const feas    = report?.feasibilityScore  ?? report?.FeasibilityScore  ?? 0;
  const strat   = report?.strategicScore    ?? report?.StrategicScore    ?? 0;
  const risk    = report?.riskScore         ?? report?.RiskScore         ?? 0;
  const roi     = report?.roiScore          ?? report?.RoiScore          ?? 0;
  const budget  = report?.suggestedBudget   ?? report?.SuggestedBudget   ?? 0;
  const riskTxt = report?.riskAssessment    ?? report?.RiskAssessment    ?? '';
  const roiTxt  = report?.roiAnalysis       ?? report?.RoiAnalysis       ?? '';
  const conf    = report?.confidence        ?? report?.Confidence        ?? '';
  const domain  = report?.domain            ?? report?.Domain            ?? '';
  const ts      = report?.analysisTimestamp ?? report?.AnalysisTimestamp ?? '';

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '95vw',
          background: 'linear-gradient(145deg, #0f172a, #1e293b)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          borderRadius: '16px',
          animation: 'aiModalIn 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <style>{`
          @keyframes aiModalIn {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)   scale(1); }
          }
          @keyframes scanline {
            0%   { background-position: 0 0; }
            100% { background-position: 0 100px; }
          }
          @keyframes pulse-rec { 0%,100% { box-shadow: 0 0 0 0 currentColor; } 50% { box-shadow: 0 0 0 4px transparent; } }
          .ai-loading-bar {
            height: 2px;
            background: linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent);
            background-size: 200% 100%;
            animation: shimmer 1.5s linear infinite;
          }
          @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
          .ai-meta-tag {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 10px; border-radius: 99px;
            font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
            background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08);
          }
          .ai-section {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            padding: 1rem 1.1rem;
            margin-bottom: 0.85rem;
          }
          .ai-section h4 {
            font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em;
            text-transform: uppercase; color: #64748b; margin: 0 0 0.6rem 0;
          }
          .ai-section p {
            font-size: 0.875rem; color: #cbd5e1; line-height: 1.7; margin: 0;
          }
          .ai-section p::after { content: '▋'; animation: blink 0.8s step-end infinite; }
          @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9', letterSpacing: '0.01em' }}>AI Decision Engine</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>Autonomous Proposal Evaluator v2.4</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', borderRadius: 8, width: 32, height: 32,
              cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        {/* Running progress line */}
        {loading && <div className="ai-loading-bar" style={{ margin: '0.85rem 0 0' }} />}

        {/* Body */}
        <div style={{ padding: '1.1rem 1.5rem 1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              {/* Spinning orb */}
              <div style={{ position: 'relative', width: 70, height: 70, margin: '0 auto 1.25rem' }}>
                <div style={{
                  width: 70, height: 70, borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.15)',
                  borderTopColor: '#6366f1', borderRightColor: '#06b6d4',
                  animation: 'spin 0.9s linear infinite',
                  position: 'absolute'
                }} />
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  border: '2px solid rgba(6,182,212,0.15)',
                  borderBottomColor: '#06b6d4',
                  animation: 'spin 1.4s linear infinite reverse',
                  position: 'absolute', top: 10, left: 10
                }} />
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'radial-gradient(circle, #6366f1, #06b6d4)',
                  boxShadow: '0 0 15px #6366f1',
                  position: 'absolute', top: 25, left: 25
                }} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', transition: 'all 0.3s' }}>
                {LOADING_STEPS[loadingStep]}
              </p>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: '0.75rem' }}>
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === loadingStep ? 16 : 6, height: 6,
                    borderRadius: 99,
                    background: i === loadingStep ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s'
                  }} />
                ))}
              </div>
            </div>
          ) : report ? (
            <>
              {/* Meta tags row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {domain && <span className="ai-meta-tag">📁 {domain}</span>}
                {conf   && <span className="ai-meta-tag">🎯 Confidence {conf}</span>}
                {ts     && <span className="ai-meta-tag">🕐 {ts}</span>}
              </div>

              {/* Recommendation + Budget */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 1.1rem', borderRadius: 99,
                  background: `${recColor}18`,
                  border: `1px solid ${recColor}55`,
                  color: recColor, fontWeight: 700, fontSize: '0.9rem',
                  animation: 'aiModalIn 0.4s',
                }}>
                  {rec === 'Approve' ? '✅' : rec === 'Conditional Approve' ? '⚡' : '❌'}
                  {rec}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Suggested Budget</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', color: '#f1f5f9', fontWeight: 700 }}>
                    {budget?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Executive Summary with typewriter */}
              <div className="ai-section">
                <h4>🧠 Executive Summary</h4>
                <p style={{ minHeight: '2.5em' }}>{summaryText}</p>
              </div>

              {/* Score bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1rem' }}>
                <AiScoreBar label="⚙️  Technical Feasibility" score={feas}  color="#6366f1" delay={100} />
                <AiScoreBar label="🎯  Strategic Alignment"   score={strat} color="#06b6d4" delay={250} />
                <AiScoreBar label="🛡️  Risk Safety Index"      score={risk}  color="#10b981" delay={400} />
                <AiScoreBar label="💰  ROI Potential"          score={roi}   color="#f59e0b" delay={550} />
              </div>

              {/* Risk Assessment */}
              <div className="ai-section">
                <h4>⚠️ Risk Factor Profile</h4>
                <p>{riskTxt}</p>
              </div>

              {/* ROI Analysis */}
              <div className="ai-section">
                <h4>📈 Financial Yield Analysis</h4>
                <p>{roiTxt}</p>
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
              ⚠️ AI Engine returned no data. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'flex-end', gap: '0.6rem'
          }}>
            <button className="btn btn-secondary" onClick={onClose}
              style={{ borderRadius: 8, fontSize: '0.85rem' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
