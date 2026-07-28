import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function ProposalMarketplace({ user, setCurrentTab, setDiscussionId }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');
  const [minFunding, setMinFunding] = useState('');
  const [maxFunding, setMaxFunding] = useState('');
  const [minEquity, setMinEquity] = useState('');
  const [maxEquity, setMaxEquity] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Detail Modal state
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchProposals = async () => {
    try {
      let query = `?sortBy=${sortBy}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (industry) query += `&industry=${encodeURIComponent(industry)}`;
      if (category) query += `&category=${encodeURIComponent(category)}`;
      if (minFunding) query += `&minFunding=${minFunding}`;
      if (maxFunding) query += `&maxFunding=${maxFunding}`;
      if (minEquity) query += `&minEquity=${minEquity}`;
      if (maxEquity) query += `&maxEquity=${maxEquity}`;

      const data = await api.get(`/marketplace${query}`);
      setProposals(data);

      // Refresh selected proposal details in modal if it's open
      if (selectedProposal) {
        const updatedDetail = await api.get(`/marketplace/${selectedProposal.id}`);
        setSelectedProposal(updatedDetail);
      }
    } catch (err) {
      console.error('Error fetching marketplace proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();

    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchProposals();
    });
    return () => unsubscribe();
  }, [search, industry, category, minFunding, maxFunding, minEquity, maxEquity, sortBy]);

  const handleLike = async (proposalId) => {
    try {
      const result = await api.post(`/social/proposals/${proposalId}/like`);
      // Instant local state updates
      setProposals(prev => prev.map(p => {
        if (p.id === proposalId) {
          return { ...p, hasLiked: result.liked, likeCount: result.likeCount };
        }
        return p;
      }));
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal(prev => ({
          ...prev,
          hasLiked: result.liked,
          likeCount: result.likeCount
        }));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleInterest = async (proposalId) => {
    if (user.role !== 'Investor') return;
    try {
      const result = await api.post(`/marketplace/${proposalId}/interest`);
      setProposals(prev => prev.map(p => {
        if (p.id === proposalId) {
          return { ...p, hasInterested: result.interested, interestCount: result.interestCount };
        }
        return p;
      }));
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal(prev => ({
          ...prev,
          hasInterested: result.interested,
          interestCount: result.interestCount
        }));
      }
    } catch (err) {
      console.error('Error toggling interest:', err);
    }
  };

  const handleOpenDiscussion = async (proposalId) => {
    if (user.role !== 'Investor') return;
    try {
      const room = await api.post('/discussions/start', { proposalId });
      setDiscussionId(room.id);
      setCurrentTab('discussions');
    } catch (err) {
      console.error('Error starting discussion:', err);
      alert('Could not open discussion room. Please try again.');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackContent.trim() || !selectedProposal) return;

    setSubmittingFeedback(true);
    try {
      const newComment = await api.post(`/marketplace/${selectedProposal.id}/feedback`, {
        content: feedbackContent
      });
      setSelectedProposal(prev => ({
        ...prev,
        commentCount: prev.commentCount + 1,
        comments: [...(prev.comments || []), newComment]
      }));
      setFeedbackContent('');
      // Trigger feed refresh in background
      fetchProposals();
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?\S*v=|&v=)([^#&?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const fmtCurrency = (val) => {
    return (val ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return <span className="badge badge-draft">Draft</span>;
      case 'Submitted': return <span className="badge badge-submitted">Submitted</span>;
      case 'UnderReview': return <span className="badge badge-underreview">Under Review</span>;
      case 'Reviewed': return <span className="badge badge-reviewed">Reviewed</span>;
      case 'Approved': return <span className="badge badge-approved">Approved</span>;
      case 'Rejected': return <span className="badge badge-rejected">Rejected</span>;
      case 'FundAllocated': return <span className="badge badge-fundallocated">Fund Allocated</span>;
      default: return null;
    }
  };

  const handleOpenDetails = async (proposal) => {
    setSelectedProposal(proposal);
    try {
      const details = await api.get(`/marketplace/${proposal.id}`);
      setSelectedProposal(details);
    } catch (err) {
      console.error('Error loading details:', err);
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1400px' }}>
      
      {/* Top Filter & Sort Bar */}
      <div style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          🏪 PROPOSAL MARKETPLACE
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label>Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Title, startup, keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Industry</label>
            <select className="form-select" value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">All Industries</option>
              <option value="FinTech">FinTech</option>
              <option value="HealthTech">HealthTech</option>
              <option value="EdTech">EdTech</option>
              <option value="AgriTech">AgriTech</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="DeepTech">DeepTech</option>
              <option value="SaaS">SaaS</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Funding Ask Range ($)</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Min"
                value={minFunding}
                onChange={e => setMinFunding(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="number"
                className="form-input"
                placeholder="Max"
                value={maxFunding}
                onChange={e => setMaxFunding(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Equity Offered (%)</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Min %"
                value={minEquity}
                onChange={e => setMinEquity(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="number"
                className="form-input"
                placeholder="Max %"
                value={maxEquity}
                onChange={e => setMaxEquity(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Sort By</label>
            <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recent">Latest Added</option>
              <option value="popular">Popularity (Interests)</option>
              <option value="funding">Funding Request</option>
              <option value="equity">Equity Offered</option>
            </select>
          </div>

        </div>
      </div>

      {/* Grid of Proposal Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-lg)',
          color: 'var(--text-muted)'
        }}>
          <h3>No proposals match your filters.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Try broadening your search criteria.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {proposals.map(prop => (
            <div
              key={prop.id}
              onClick={() => handleOpenDetails(prop)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s, box-shadow 0.25s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-cyan)' }}>
                    🚀 {prop.startupName || 'Startup'}
                  </span>
                  {getStatusBadge(prop.status)}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {prop.title}
                </h3>

                {/* Description */}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {prop.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {prop.industry && (
                    <span style={{ fontSize: '0.62rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'rgba(165, 180, 252, 0.95)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      {prop.industry}
                    </span>
                  )}
                  {prop.category && (
                    <span style={{ fontSize: '0.62rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                      {prop.category}
                    </span>
                  )}
                  <span style={{ fontSize: '0.62rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)' }}>
                    {prop.department}
                  </span>
                </div>
              </div>

              {/* Financial metrics & Engagement */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Funding Ask</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {fmtCurrency(prop.requestedAmount)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Equity Offer</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>
                      {prop.equityOffered}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>By {prop.submitter?.fullName || 'Founder'}</span>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      🔥 {prop.interestCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      ❤️ {prop.likeCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      💬 {prop.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProposal && (
        <div className="modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-hover)' }}>
            
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', background: 'rgba(99,102,241,0.15)', color: 'rgba(165,180,252,0.95)', border: '1px solid rgba(99,102,241,0.3)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  🚀 {selectedProposal.startupName || 'Startup'}
                </span>
                {getStatusBadge(selectedProposal.status)}
              </div>
              <button className="modal-close" onClick={() => setSelectedProposal(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', maxHeight: '78vh' }}>
              
              {/* Left Column: Full Startup Profile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{selectedProposal.title}</h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{selectedProposal.description}</p>
                </div>

                <div className="ai-analysis-block" style={{ margin: 0 }}>
                  <h4>🎯 Problem Statement</h4>
                  <p style={{ fontSize: '0.85rem' }}>{selectedProposal.problemStatement}</p>
                </div>

                <div className="ai-analysis-block" style={{ margin: 0 }}>
                  <h4>💡 Proposed Solution</h4>
                  <p style={{ fontSize: '0.85rem' }}>{selectedProposal.proposedStatement}</p>
                </div>

                {selectedProposal.businessModel && (
                  <div className="ai-analysis-block" style={{ margin: 0 }}>
                    <h4>💼 Business Model</h4>
                    <p style={{ fontSize: '0.85rem' }}>{selectedProposal.businessModel}</p>
                  </div>
                )}

                <div className="ai-analysis-block" style={{ margin: 0 }}>
                  <h4>👥 Founders & Team</h4>
                  <p style={{ fontSize: '0.85rem' }}>{selectedProposal.teamDetails}</p>
                </div>

                {selectedProposal.demoVideoUrl && (
                  <div className="ai-analysis-block" style={{ margin: 0 }}>
                    <h4>🎬 Pitch / Demo Video</h4>
                    {getEmbedUrl(selectedProposal.demoVideoUrl) ? (
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <iframe
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                          src={getEmbedUrl(selectedProposal.demoVideoUrl)}
                          title="Pitch Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a href={selectedProposal.demoVideoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontSize: '0.85rem' }}>
                        Watch Demo Video ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Financials, Actions & Community Engagement */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Financial Summary */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1rem'
                }}>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                    Financial Offering
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>FUNDING ASK</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {fmtCurrency(selectedProposal.requestedAmount)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>EQUITY OFFER</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>
                        {selectedProposal.equityOffered}%
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                    <strong>Founder:</strong> {selectedProposal.submitter?.fullName} ({selectedProposal.submitter?.email})
                  </div>
                </div>

                {/* Action Controls for Investors */}
                {user.role === 'Investor' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      className="btn"
                      onClick={() => handleInterest(selectedProposal.id)}
                      style={{
                        margin: 0,
                        background: selectedProposal.hasInterested ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(245,158,11,0.15)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        color: selectedProposal.hasInterested ? '#fff' : '#fbbf24',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: selectedProposal.hasInterested ? '0 4px 15px rgba(245, 158, 11, 0.3)' : 'none'
                      }}
                    >
                      🔥 {selectedProposal.hasInterested ? 'Expressed Interest' : 'Express Interest'}
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenDiscussion(selectedProposal.id)}
                      style={{ margin: 0, fontSize: '0.9rem' }}
                    >
                      💬 Open Private Discussion Room
                    </button>
                  </div>
                )}

                {/* Community Interaction Status */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    className="btn"
                    onClick={() => handleLike(selectedProposal.id)}
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: '0.4rem',
                      background: selectedProposal.hasLiked ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      color: selectedProposal.hasLiked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.78rem'
                    }}
                  >
                    👍 {selectedProposal.hasLiked ? 'Liked' : 'Like'} ({selectedProposal.likeCount})
                  </button>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    🔥 {selectedProposal.interestCount} Interested
                  </div>
                </div>

                {/* Feedback Comments Section */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: '220px'
                }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    Community Rating & Feedback ({selectedProposal.comments?.length || 0})
                  </h4>

                  {/* Feedback comments list */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    maxHeight: '180px',
                    paddingRight: '0.25rem',
                    marginBottom: '0.75rem'
                  }}>
                    {(!selectedProposal.comments || selectedProposal.comments.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        No feedback posted yet.
                      </div>
                    ) : (
                      selectedProposal.comments.map(c => (
                        <div key={c.id} style={{
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            <span><strong>{c.userName}</strong> ({c.userRole})</span>
                            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            {c.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Feedback input form */}
                  <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Share constructive feedback..."
                      value={feedbackContent}
                      onChange={e => setFeedbackContent(e.target.value)}
                      style={{ margin: 0, padding: '0.45rem', fontSize: '0.78rem', borderRadius: '6px', flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingFeedback || !feedbackContent.trim()}
                      style={{ margin: 0, padding: '0.45rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px' }}
                    >
                      Submit
                    </button>
                  </form>

                </div>

              </div>

            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProposal(null)}>Close Details</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
