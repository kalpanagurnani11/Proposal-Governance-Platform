import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function SubmitterDashboard({ currentTab, setCurrentTab }) {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [capitalAllocation, setCapitalAllocation] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form states for Drawdown
  const [drawdownAmount, setDrawdownAmount] = useState('');
  const [drawdownDesc, setDrawdownDesc] = useState('');
  const [drawdownError, setDrawdownError] = useState('');

  // Form states for New/Edit Proposal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProposals = async () => {
    try {
      const data = await api.get('/proposals');
      setProposals(data);
    } catch (err) {
      console.error('Error fetching proposals', err);
    }
  };

  useEffect(() => {
    fetchProposals();
    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchProposals();
      // If we have a selected proposal, refresh it too
      if (selectedProposal) {
        handleViewProposal(selectedProposal);
      }
    });
    return () => unsubscribe();
  }, [selectedProposal]);

  const handleViewProposal = async (proposal) => {
    setSelectedProposal(proposal);
    setReviews([]);
    setCapitalAllocation(null);
    setTransactions([]);

    try {
      // Get reviews
      if (proposal.status !== 'Draft' && proposal.status !== 'Submitted') {
        const revData = await api.get(`/reviews/proposal/${proposal.id}`);
        setReviews(revData);
      }

      // Get capital allocation if funded
      if (proposal.status === 'FundAllocated' || proposal.status === 'Approved') {
        const capData = await api.get(`/capital/proposal/${proposal.id}`).catch(() => null);
        setCapitalAllocation(capData);
        if (capData) {
          const txData = await api.get(`/capital/transactions/${capData.id}`).catch(() => []);
          setTransactions(txData);
        }
      }
    } catch (err) {
      console.error('Error loading detail assets', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError('');

    try {
      const result = await api.upload('/files/upload', file);
      setUploadedFilePath(result.filePath);
      setUploadedFileName(result.originalName);
    } catch (err) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCreateOrUpdateProposal = async (e) => {
    e.preventDefault();
    if (!title || !description || !requestedAmount) {
      setFormError('Please fill in all fields.');
      return;
    }

    setFormError('');
    const payload = {
      title,
      description,
      requestedAmount: parseFloat(requestedAmount),
      supportingDocumentPath: uploadedFilePath
    };

    try {
      if (currentTab === 'new-proposal') {
        await api.post('/proposals', payload);
        setTitle('');
        setDescription('');
        setRequestedAmount('');
        setUploadedFilePath('');
        setUploadedFileName('');
        setCurrentTab('dashboard');
      } else {
        // Edit draft
        await api.put(`/proposals/${selectedProposal.id}`, payload);
        setSelectedProposal(null);
        setCurrentTab('dashboard');
      }
      fetchProposals();
    } catch (err) {
      setFormError(err.message || 'Failed to submit proposal form.');
    }
  };

  const handleSubmitProposal = async (proposalId) => {
    if (!window.confirm('Are you sure you want to submit this proposal for governance review? Once submitted, it cannot be edited.')) return;
    try {
      await api.post(`/proposals/${proposalId}/submit`);
      fetchProposals();
      setSelectedProposal(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerAiAnalysis = async (proposalId) => {
    setAiLoading(true);
    setAiReport(null);
    setShowAiModal(true);
    try {
      const data = await api.post(`/proposals/${proposalId}/analyze`);
      setAiReport(data);
    } catch (err) {
      console.error(err);
      setAiReport({ error: 'AI engine offline.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleDrawdownSubmit = async (e) => {
    e.preventDefault();
    if (!drawdownAmount || parseFloat(drawdownAmount) <= 0) {
      setDrawdownError('Enter a valid disbursement amount.');
      return;
    }

    setDrawdownError('');
    try {
      const updatedAllocation = await api.post('/capital/drawdown', {
        proposalId: selectedProposal.id,
        amount: parseFloat(drawdownAmount),
        description: drawdownDesc || 'Submitter drawdown request'
      });
      
      setCapitalAllocation(updatedAllocation);
      setDrawdownAmount('');
      setDrawdownDesc('');

      // Reload transactions
      const txData = await api.get(`/capital/transactions/${updatedAllocation.id}`).catch(() => []);
      setTransactions(txData);
    } catch (err) {
      setDrawdownError(err.message || 'Drawdown execution failed.');
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

  // Switch to editing state
  const handleEditDraftClick = (proposal) => {
    setTitle(proposal.title);
    setDescription(proposal.description);
    setRequestedAmount(proposal.requestedAmount.toString());
    setUploadedFilePath(proposal.supportingDocumentPath);
    setUploadedFileName(proposal.supportingDocumentPath ? proposal.supportingDocumentPath.split('/').pop() : '');
    setCurrentTab('edit-proposal');
  };

  return (
    <div className="page-container">
      {/* 1. New or Edit Proposal Form Tab */}
      {(currentTab === 'new-proposal' || currentTab === 'edit-proposal') && (
        <div className="auth-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header mb-1" style={{ borderBottom: 'none', padding: '0 0 1rem 0' }}>
            <h3>{currentTab === 'new-proposal' ? 'Draft Corporate Proposal' : 'Edit Proposal Draft'}</h3>
          </div>
          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-rejected)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateOrUpdateProposal}>
            <div className="form-group">
              <label>Proposal Title</label>
              <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Cloud Data Migration Phase 2" />
            </div>

            <div className="form-group">
              <label>Project Scope & Objectives</label>
              <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Outline the strategic objectives, deliverables, and estimated capital ROI..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Requested Capital Budget ($)</label>
                <input type="number" step="0.01" className="form-input" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} placeholder="E.g. 250000" />
              </div>

              <div className="form-group">
                <label>Supporting Documentation</label>
                <input type="file" className="form-input" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label htmlFor="file-upload" className="btn btn-secondary" style={{ padding: '0.7rem 1.2rem', margin: '0', fontSize: '0.85rem' }}>
                    Choose File
                  </label>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {uploadLoading ? 'Uploading...' : uploadedFileName || 'No file chosen'}
                  </span>
                </div>
                {uploadError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{uploadError}</p>}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setSelectedProposal(null); setCurrentTab('dashboard'); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Main Dashboard Tab */}
      {currentTab === 'dashboard' && (
        <div className="dashboard-columns">
          {/* Left Column: Proposals List */}
          <div>
            <div className="table-card">
              <div className="card-header">
                <h3>My Business Proposals</h3>
              </div>
              {proposals.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>You haven't created any proposals yet. Click 'New Proposal' to start.</p>
              ) : (
                <table className="governance-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Budget Request</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((prop) => (
                      <tr key={prop.id} onClick={() => handleViewProposal(prop)} style={{ cursor: 'pointer', background: selectedProposal?.id === prop.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ fontWeight: '500' }}>{prop.title}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{prop.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(prop.status)}`}>{prop.status}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(prop.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleViewProposal(prop); }}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Selected Detail & Financials */}
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
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '600' }}>{selectedProposal.title}</h2>
                  <h4 style={{ marginTop: '0.5rem' }}>Description</h4>
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

                {/* Supporting Document Download */}
                {selectedProposal.supportingDocumentPath && (
                  <div className="detail-section">
                    <h4>Supporting Documentation</h4>
                    <a
                      href={api.downloadUrl(selectedProposal.supportingDocumentPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download Document
                    </a>
                  </div>
                )}

                {/* Draft Actions */}
                {selectedProposal.status === 'Draft' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => handleEditDraftClick(selectedProposal)}>
                      Edit Draft
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => handleSubmitProposal(selectedProposal.id)}>
                      Submit to Governance
                    </button>
                  </div>
                )}

                {/* AI report trigger button */}
                <button
                  className="btn btn-secondary"
                  onClick={() => triggerAiAnalysis(selectedProposal.id)}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '1rem',
                    border: '1px solid rgba(6,182,212,0.3)',
                    color: 'var(--accent-cyan)',
                    background: 'rgba(6,182,212,0.05)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                  </svg>
                  Generate AI Analytical Report
                </button>

                {/* Reviews List */}
                {reviews.length > 0 && (
                  <div className="detail-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Reviewer Evaluations</h4>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <div className="flex-between mb-1">
                          <strong>{rev.reviewer?.fullName}</strong>
                          <span style={{ color: 'var(--accent-cyan)' }}>Avg Score: {Math.round((rev.feasibilityScore + rev.strategicScore + rev.riskScore + rev.roiScore) / 4, 1)}/10</span>
                        </div>
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Capital Allocation & Drawdowns */}
                {capitalAllocation && (
                  <div className="detail-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Capital Drawdown Tracker</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Allocated:</span>{' '}
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{capitalAllocation.allocatedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Disbursed:</span>{' '}
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{capitalAllocation.disbursedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Fund Utilization Progress</span>
                        <span>{Math.round((capitalAllocation.disbursedAmount / capitalAllocation.allocatedAmount) * 100)}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar cyan" style={{ width: `${(capitalAllocation.disbursedAmount / capitalAllocation.allocatedAmount) * 100}%` }}></div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                      <h5 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>Disburse Funds (Drawdown)</h5>
                      {drawdownError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{drawdownError}</p>}
                      <form onSubmit={handleDrawdownSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={drawdownAmount}
                          onChange={(e) => setDrawdownAmount(e.target.value)}
                          placeholder="Amount ($) to disburse"
                          style={{ padding: '0.5rem' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={drawdownDesc}
                          onChange={(e) => setDrawdownDesc(e.target.value)}
                          placeholder="Purpose (e.g. Server procurement)"
                          style={{ padding: '0.5rem' }}
                        />
                        <button type="submit" className="btn btn-success" style={{ padding: '0.4rem', fontSize: '0.85rem' }}>
                          Execute Drawdown
                        </button>
                      </form>
                    </div>

                    {/* Transaction History Feed */}
                    {transactions.length > 0 && (
                      <div style={{ marginTop: '1.25rem' }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>Transaction History</h5>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {transactions.map((tx) => (
                            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem' }}>
                              <div>
                                <span style={{ fontWeight: '600', color: tx.type === 'Allocation' ? 'var(--accent-secondary)' : 'var(--accent-cyan)' }}>
                                  [{tx.type}]
                                </span>{' '}
                                <span>{tx.description}</span>
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)' }}>
                                {tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="detail-card text-center" style={{ padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--border-hover)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>Select a proposal from the left pane to view analytical reports, reviews, and manage capital drawdowns.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI REPORT MODAL */}
      {showAiModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>AI Decision Assistant Report</h3>
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
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suggested Budget Funding</span>
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
                  <div className="ai-analysis-block">
                    <h4>Actionable Suggestion</h4>
                    <p>{aiReport.Suggestion}</p>
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
