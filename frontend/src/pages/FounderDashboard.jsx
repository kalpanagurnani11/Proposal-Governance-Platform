import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';
import AiReportModal from '../components/AiReportModal';

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

export default function FounderDashboard({ user, setUser, currentTab, setCurrentTab }) {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [capitalAllocation, setCapitalAllocation] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Patent States
  const [patentInput, setPatentInput] = useState(user?.patentId || '');
  const [verifyingPatent, setVerifyingPatent] = useState(false);
  const [patentError, setPatentError] = useState('');
  const [patentSuccess, setPatentSuccess] = useState('');
  const [showPatentDetailsModal, setShowPatentDetailsModal] = useState(false);

  // Sync state if user prop updates
  useEffect(() => {
    if (user?.patentId) {
      setPatentInput(user.patentId);
    }
  }, [user]);

  const handleVerifyPatent = async (e) => {
    e.preventDefault();
    setVerifyingPatent(true);
    setPatentError('');
    setPatentSuccess('');

    try {
      const res = await api.post('/auth/verify-patent', {
        userId: user.id,
        patentId: patentInput.trim()
      });

      const updatedUser = {
        ...user,
        patentId: res.patentId,
        patentVerificationStatus: res.patentVerificationStatus,
        patentDetailsJson: res.patentDetailsJson
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      if (res.patentVerificationStatus === 'Verified') {
        setPatentSuccess('Patent verified successfully!');
      } else if (res.patentVerificationStatus === 'VerificationFailed') {
        const details = res.patentDetailsJson ? JSON.parse(res.patentDetailsJson) : {};
        setPatentError(details.Error || 'Patent verification failed.');
      } else {
        setPatentSuccess('Patent ID removed.');
      }
    } catch (err) {
      setPatentError(err.message || 'Verification request failed.');
    } finally {
      setVerifyingPatent(false);
    }
  };

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

  // Startup Pitch Specific States
  const [startupName, setStartupName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedStatement, setProposedStatement] = useState('');
  const [equityOffered, setEquityOffered] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [teamDetails, setTeamDetails] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRequestedAmount('');
    setUploadedFilePath('');
    setUploadedFileName('');
    setStartupName('');
    setProblemStatement('');
    setProposedStatement('');
    setEquityOffered('');
    setBusinessModel('');
    setTeamDetails('');
    setDemoVideoUrl('');
    setFormError('');
  };

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
    if (!title || !description || !requestedAmount || !startupName || !problemStatement || !proposedStatement || !equityOffered || !teamDetails) {
      setFormError('Please fill in all required fields marked with *.');
      return;
    }

    if (parseFloat(equityOffered) < 0 || parseFloat(equityOffered) > 100) {
      setFormError('Equity Offered must be between 0% and 100%.');
      return;
    }

    setFormError('');
    const payload = {
      title,
      description,
      requestedAmount: parseFloat(requestedAmount),
      supportingDocumentPath: uploadedFilePath,
      startupName,
      problemStatement,
      proposedStatement,
      equityOffered: parseFloat(equityOffered),
      businessModel,
      teamDetails,
      demoVideoUrl
    };

    try {
      if (currentTab === 'new-proposal') {
        await api.post('/proposals', payload);
        resetForm();
        setCurrentTab('dashboard');
      } else {
        // Edit draft
        await api.put(`/proposals/${selectedProposal.id}`, payload);
        setSelectedProposal(null);
        resetForm();
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
        description: drawdownDesc || 'Founder drawdown request'
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
    
    // Set startup fields
    setStartupName(proposal.startupName || '');
    setProblemStatement(proposal.problemStatement || '');
    setProposedStatement(proposal.proposedStatement || '');
    setEquityOffered(proposal.equityOffered ? proposal.equityOffered.toString() : '');
    setBusinessModel(proposal.businessModel || '');
    setTeamDetails(proposal.teamDetails || '');
    setDemoVideoUrl(proposal.demoVideoUrl || '');
    
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Startup Name *</label>
                <input type="text" className="form-input" value={startupName} onChange={(e) => setStartupName(e.target.value)} placeholder="E.g. Acme Analytics Corp" />
              </div>
              <div className="form-group">
                <label>Proposal Title *</label>
                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. NextGen Machine Learning Infrastructure" />
              </div>
            </div>

            <div className="form-group">
              <label>Brief Pitch Description *</label>
              <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short, high-level overview of your startup proposal..." rows="2" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Problem Statement *</label>
                <textarea className="form-textarea" value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} placeholder="What critical problem does your startup solve?..." style={{ minHeight: '120px' }} />
              </div>
              <div className="form-group">
                <label>Proposed Solution *</label>
                <textarea className="form-textarea" value={proposedStatement} onChange={(e) => setProposedStatement(e.target.value)} placeholder="Outline your solution and unique value proposition..." style={{ minHeight: '120px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Funding Requirement ($) *</label>
                <input type="number" step="0.01" className="form-input" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} placeholder="E.g. 250000" />
              </div>

              <div className="form-group">
                <label>Equity Offered (%) *</label>
                <input type="number" step="0.01" className="form-input" value={equityOffered} onChange={(e) => setEquityOffered(e.target.value)} placeholder="E.g. 10.0" />
              </div>

              <div className="form-group">
                <label>Demo Video Link <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span></label>
                <input type="url" className="form-input" value={demoVideoUrl} onChange={(e) => setDemoVideoUrl(e.target.value)} placeholder="YouTube, Drive, or Loom URL" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Team Details *</label>
                <textarea className="form-textarea" value={teamDetails} onChange={(e) => setTeamDetails(e.target.value)} placeholder="List key founders, roles, and experience..." style={{ minHeight: '100px' }} />
              </div>
              <div className="form-group">
                <label>Business Model <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span></label>
                <textarea className="form-textarea" value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} placeholder="How will your startup generate revenue?..." style={{ minHeight: '100px' }} />
              </div>
            </div>

            <div className="form-group">
              <label>Supporting Documentation</label>
              <input type="file" className="form-input" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <label htmlFor="file-upload" className="btn btn-secondary" style={{ padding: '0.7rem 1.2rem', margin: '0', fontSize: '0.85rem' }}>
                  Choose File
                </label>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadLoading ? 'Uploading...' : uploadedFileName || 'No file chosen'}
                </span>
              </div>
              {uploadError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{uploadError}</p>}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { resetForm(); setSelectedProposal(null); setCurrentTab('dashboard'); }}>
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
          {/* Left Column: Proposals List */}
          <div>
            {/* User Identity / Patent Verification Card */}
            <div className="table-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.4), rgba(10, 10, 20, 0.6))' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🛡️ Identity & Patent Verification
                </h3>
                {user?.patentVerificationStatus === 'Verified' && (
                  <span
                    className={`badge ${(() => { try { return JSON.parse(user.patentDetailsJson || '{}').RecordType === 'Application' ? 'badge-submitted' : 'badge-approved'; } catch { return 'badge-approved'; } })()}`}
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                  >
                    {(() => { try { return JSON.parse(user.patentDetailsJson || '{}').RecordType === 'Application' ? '📝 Application Filed' : '✅ Verified Inventor'; } catch { return 'Verified'; } })()}
                  </span>
                )}
              </div>
              <div style={{ padding: '1rem' }}>
                {user?.patentVerificationStatus === 'Verified' ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {(() => { try { return JSON.parse(user.patentDetailsJson || '{}').RecordType === 'Application' ? 'Linked Application No:' : 'Linked Patent ID:'; } catch { return 'Linked ID:'; } })()}{' '}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {user.patentId}
                        </span>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', margin: 0 }} 
                        onClick={() => setShowPatentDetailsModal(true)}
                      >
                        View Details
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '4px', padding: '0.4rem' }}>
                      {(() => { try { return JSON.parse(user.patentDetailsJson || '{}').RecordType === 'Application' ? '📋 Patent application linked. Status can be verified at the official IPO portal.' : '✅ Credentials verified. Your submissions display a Verified Inventor badge to reviewers.'; } catch { return '✅ Credentials linked.'; } })()}
                    </p>
                  </div>
                ) : user?.patentVerificationStatus === 'VerificationFailed' ? (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-rejected)', fontWeight: '500' }}>
                      ⚠️ Verification Failed: <span style={{ fontFamily: 'var(--font-mono)' }}>{user.patentId}</span>
                    </p>
                    <p style={{ margin: '0.2rem 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {user.patentDetailsJson ? JSON.parse(user.patentDetailsJson).Error : 'Invalid registry record.'}
                    </p>
                    <form onSubmit={handleVerifyPatent} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Correct Patent ID (e.g. US10123456)"
                        value={patentInput}
                        onChange={(e) => setPatentInput(e.target.value)}
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', margin: 0 }} disabled={verifyingPatent}>
                        {verifyingPatent ? 'Verifying...' : 'Retry'}
                      </button>
                    </form>
                    {patentError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{patentError}</p>}
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Link a patent or application number to authenticate your inventor background. Supported: US (e.g. <code>US10123456</code>), Indian IPO (e.g. <code>202521044863</code>), EP, WO.
                    </p>
                    <form onSubmit={handleVerifyPatent} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Patent ID (e.g. US10123456)"
                        value={patentInput}
                        onChange={(e) => setPatentInput(e.target.value)}
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', margin: 0 }} disabled={verifyingPatent}>
                        {verifyingPatent ? 'Verifying...' : 'Verify & Link'}
                      </button>
                    </form>
                    {patentError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{patentError}</p>}
                    {patentSuccess && <p style={{ color: 'var(--color-approved)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{patentSuccess}</p>}
                  </div>
                )}
              </div>
            </div>

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
                  {selectedProposal.startupName && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '0.2rem 0.75rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(165,180,252,0.9)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 {selectedProposal.startupName}</span>
                    </div>
                  )}
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '600' }}>{selectedProposal.title}</h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{selectedProposal.description}</p>
                </div>

                {/* Key Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Funding Ask</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedProposal.requestedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                  </div>
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Equity Offered</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.9)' }}>{selectedProposal.equityOffered != null ? `${selectedProposal.equityOffered}%` : '—'}</div>
                  </div>
                  {selectedProposal.approvedAmount > 0 ? (
                    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Approved</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{selectedProposal.approvedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Status</div>
                      <span className={`badge ${getStatusBadgeClass(selectedProposal.status)}`} style={{ fontSize: '0.72rem' }}>{selectedProposal.status}</span>
                    </div>
                  )}
                </div>

                {/* Problem & Solution */}
                {(selectedProposal.problemStatement || selectedProposal.proposedStatement) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {selectedProposal.problemStatement && (
                      <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>⚠️ Problem</div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.problemStatement}</p>
                      </div>
                    )}
                    {selectedProposal.proposedStatement && (
                      <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>✅ Solution</div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.proposedStatement}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Team & Business Model */}
                {(selectedProposal.teamDetails || selectedProposal.businessModel) && (
                  <div style={{ display: 'grid', gridTemplateColumns: selectedProposal.businessModel ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {selectedProposal.teamDetails && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>👥 Team</div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.teamDetails}</p>
                      </div>
                    )}
                    {selectedProposal.businessModel && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>💼 Business Model</div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProposal.businessModel}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Demo Video */}
                {selectedProposal.demoVideoUrl && (() => {
                  const embedUrl = getYouTubeEmbedUrl(selectedProposal.demoVideoUrl);
                  return (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.5rem' }}>🎬 Demo Video</div>
                      {embedUrl ? (
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <iframe width="100%" height="200" src={embedUrl} title="Demo Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block' }} />
                        </div>
                      ) : (
                        <a href={selectedProposal.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.5rem', gap: '0.5rem' }}>
                          ▶ Watch Demo Video
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Supporting Document Download */}
                {selectedProposal.supportingDocumentPath && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.5rem' }}>📄 Supporting Document</div>
                    <a href={api.downloadUrl(selectedProposal.supportingDocumentPath)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '100%', justifyContent: 'center' }}>
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
        <AiReportModal
          report={aiReport}
          loading={aiLoading}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {/* PATENT DETAILS MODAL */}
      {showPatentDetailsModal && user?.patentDetailsJson && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '560px', animation: 'scaleIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                🛡️ {(() => { try { return JSON.parse(user.patentDetailsJson).RecordType === 'Application' ? 'Patent Application Record' : 'Verified Patent Record'; } catch { return 'Patent Record'; } })()}
              </h3>
              <button className="btn-close" onClick={() => setShowPatentDetailsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {(() => {
              try {
                const details = JSON.parse(user.patentDetailsJson);
                const isApp = details.RecordType === 'Application';
                return (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Application Warning Banner */}
                    {isApp && (
                      <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.35)', borderRadius: '6px', padding: '0.65rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span>📋</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.8rem', color: 'rgba(251,191,36,0.95)' }}>Patent Application — Not Yet Granted</p>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            This is a <strong>pending application</strong> filed at the Indian Patent Office. It has not been granted as a patent yet.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {details.Authority && (
                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(99,102,241,0.12)', color: 'rgba(165,180,252,0.9)', border: '1px solid rgba(99,102,241,0.3)', fontWeight: '600' }}>
                          🏛️ {details.Authority}
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: isApp ? 'rgba(251,191,36,0.1)' : 'rgba(16,185,129,0.1)', color: isApp ? 'rgba(251,191,36,0.9)' : 'var(--accent-secondary)', border: `1px solid ${isApp ? 'rgba(251,191,36,0.3)' : 'rgba(16,185,129,0.3)'}`, fontWeight: '600' }}>
                        {isApp ? '📝 Pending Application' : '✅ Granted Patent'}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {isApp ? 'Title of Invention' : 'Patent Title'}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{details.Title}</p>
                    </div>

                    {/* ID + Status/Date row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          {isApp ? 'Application Number' : 'Patent ID'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {details.ApplicationNumber || user.patentId}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          {isApp ? 'Application Status' : 'Grant Date'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500', color: isApp ? 'rgba(251,191,36,0.85)' : 'white', fontSize: '0.82rem' }}>
                          {isApp ? (details.ApplicationStatus || 'Filed / Pending') : (details.IssueDate || '—')}
                        </p>
                      </div>
                    </div>

                    {/* Inventors / Applicants */}
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {isApp ? 'Applicant(s)' : 'Inventor(s)'}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{details.Inventors}</p>
                    </div>

                    {/* Abstract */}
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {isApp ? 'About the Invention' : 'Abstract'}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{details.Abstract}</p>
                    </div>

                    {/* IPO Link */}
                    {isApp && (
                      <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '0.65rem 0.85rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          🔗 <strong>Live status lookup:</strong>{' '}
                          <a href="https://iprsearch.ipindia.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>
                            iprsearch.ipindia.gov.in
                          </a>
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ color: 'var(--color-rejected)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to unlink this ${isApp ? 'application' : 'patent'} ID from your account?`)) {
                            setPatentInput('');
                            setShowPatentDetailsModal(false);
                            try {
                              await api.post('/auth/verify-patent', { userId: user.id, patentId: '' });
                              const updatedUser = { ...user, patentId: null, patentVerificationStatus: null, patentDetailsJson: null };
                              setUser(updatedUser);
                              localStorage.setItem('user', JSON.stringify(updatedUser));
                              setPatentSuccess('Patent ID removed.');
                            } catch (err) {
                              alert('Failed to unlink: ' + err.message);
                            }
                          }
                        }}
                      >
                        Unlink
                      </button>
                      <button className="btn btn-primary" onClick={() => setShowPatentDetailsModal(false)} style={{ margin: 0 }}>
                        Done
                      </button>
                    </div>
                  </div>
                );
              } catch (e) {
                return <p style={{ color: 'var(--color-rejected)', fontSize: '0.85rem' }}>Error parsing patent details.</p>;
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
