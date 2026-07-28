import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function SocialFeed() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentsText, setNewCommentsText] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const data = await api.get('/social/feed');
      setPosts(data.posts || []);
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Error fetching social feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchFeed();

    // Subscribe to SignalR real-time updates to refresh feed automatically
    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchFeed();
      // If a comment drawer is open, refresh comments for that specific post as well
      if (activeCommentPostId) {
        fetchComments(activeCommentPostId);
      }
    });
    return () => unsubscribe();
  }, [activeCommentPostId]);

  const fetchComments = async (postId) => {
    try {
      const data = await api.get(`/social/proposals/${postId}/social`);
      setCommentsMap(prev => ({
        ...prev,
        [postId]: data.comments || []
      }));
    } catch (err) {
      console.error('Error fetching comments', err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const result = await api.post(`/social/proposals/${postId}/like`);
      // Update local state immediately for instant response, backend broadcast will keep it synchronized
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            hasLiked: result.liked,
            likeCount: result.likeCount
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Error liking post', err);
    }
  };

  const toggleComments = (postId) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      fetchComments(postId);
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const content = newCommentsText[postId] || '';
    if (!content.trim()) return;

    try {
      await api.post(`/social/proposals/${postId}/comment`, { content });
      setNewCommentsText(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
      fetchFeed(); // Update comment count on feed card
    } catch (err) {
      console.error('Error posting comment', err);
    }
  };

  const handleCommentDelete = async (postId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/social/comments/${commentId}`);
      fetchComments(postId);
      fetchFeed();
    } catch (err) {
      console.error('Error deleting comment', err);
    }
  };

  const toggleDescription = (postId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const formatCurrency = (n) => (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'var(--color-rejected)'; // Pinkish red
      case 'Reviewer': return 'rgba(251,191,36,0.95)'; // Amber
      case 'Investor': return 'var(--accent-secondary)'; // Emerald
      case 'Founder':
      case 'Submitter': return 'var(--accent-cyan)'; // Blue/cyan (now Founder)
      default: return 'var(--text-secondary)';
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--accent-cyan)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <span style={{ marginLeft: '1rem', fontSize: '1.1rem' }}>Loading Community Feed...</span>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: User Profile Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-secondary))',
            color: 'var(--text-primary)',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 4px 12px rgba(6,182,212,0.3)'
          }}>
            {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
          </div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentUser?.fullName}</h3>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{currentUser?.email}</p>
          
          <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: getRoleBadgeColor(currentUser?.role) }}>
              {currentUser?.role}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', textAlign: 'left', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              <span>Department</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{currentUser?.department}</span>
            </div>
            {currentUser?.patentVerificationStatus === 'Verified' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>
                <span>Verified Inventor</span>
                <span>🛡️ Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Social Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '0.5rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌐 Community Feed
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Discuss and support active governance proposals within the organization.
            </p>
          </div>

          {posts.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <h3 style={{ marginTop: '1rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No posts in the feed yet</h3>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Proposals will show up here as soon as they are submitted.</p>
            </div>
          ) : (
            posts.map(post => {
              const isExpanded = expandedDescriptions[post.id];
              const displayDesc = isExpanded
                ? post.description
                : post.description.slice(0, 180) + (post.description.length > 180 ? '...' : '');

              const comments = commentsMap[post.id] || [];
              const showCommentsDrawer = activeCommentPostId === post.id;
              
              // Calculate funding percentage if applicable
              const fundingPct = post.approvedAmount > 0 ? Math.round(( (post.approvedAmount - (post.remainingToFund ?? post.approvedAmount)) / post.approvedAmount) * 100) : 0;
              const hasFunding = post.status === 'Approved' || post.status === 'FundAllocated';

              return (
                <div key={post.id} style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}>
                  {/* Post Author Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        {post.submitter?.fullName ? post.submitter.fullName[0].toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {post.submitter?.fullName}
                          </span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '10px',
                            background: `${getRoleBadgeColor(post.submitter?.role)}15`,
                            color: getRoleBadgeColor(post.submitter?.role),
                            border: `1px solid ${getRoleBadgeColor(post.submitter?.role)}30`,
                            textTransform: 'uppercase'
                          }}>
                            {post.submitter?.role}
                          </span>
                          {post.submitter?.patentVerificationStatus === 'Verified' && (
                            <span style={{ color: 'var(--accent-secondary)', cursor: 'help' }} title={`Verified Patent ID: ${post.submitter.patentId}`}>🛡️</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {post.submitter?.department} · {formatDate(post.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(post.status)}`} style={{ fontSize: '0.7rem' }}>
                      {post.status}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {post.title}
                      </h3>
                      {post.startupName && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '12px', padding: '0.1rem 0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(165,180,252,0.9)', fontWeight: '600' }}>🚀 {post.startupName}</span>
                        </div>
                      )}
                      {post.equityOffered != null && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '12px', padding: '0.1rem 0.5rem' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--accent-secondary)', fontWeight: '600' }}>{post.equityOffered}% equity</span>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {displayDesc}
                      {post.description.length > 180 && (
                        <button
                          onClick={() => toggleDescription(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '0 0 0 0.25rem',
                            fontWeight: '500'
                          }}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </p>

                    {/* Problem & Solution mini-chips */}
                    {(post.problemStatement || post.proposedStatement) && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                        {post.problemStatement && (
                          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '6px', padding: '0.35rem 0.6rem', flex: 1, minWidth: '120px' }}>
                            <div style={{ fontSize: '0.58rem', color: 'rgba(239,68,68,0.7)', fontWeight: '700', marginBottom: '0.15rem' }}>⚠️ PROBLEM</div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {post.problemStatement.length > 100 ? post.problemStatement.slice(0, 100) + '...' : post.problemStatement}
                            </p>
                          </div>
                        )}
                        {post.proposedStatement && (
                          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '6px', padding: '0.35rem 0.6rem', flex: 1, minWidth: '120px' }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--accent-secondary)', fontWeight: '700', marginBottom: '0.15rem' }}>✅ SOLUTION</div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {post.proposedStatement.length > 100 ? post.proposedStatement.slice(0, 100) + '...' : post.proposedStatement}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Team snippet */}
                    {post.teamDetails && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                        <span>👥</span>
                        <span style={{ lineHeight: '1.4' }}>{post.teamDetails.length > 80 ? post.teamDetails.slice(0, 80) + '...' : post.teamDetails}</span>
                      </div>
                    )}
                  </div>

                  {/* Proposal Financial / Funding Section */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: post.approvedAmount > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested</span>
                        <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '0.1rem' }}>
                          {formatCurrency(post.requestedAmount)}
                        </div>
                      </div>
                      {post.approvedAmount > 0 && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved</span>
                          <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)', marginTop: '0.1rem' }}>
                            {formatCurrency(post.approvedAmount)}
                          </div>
                        </div>
                      )}
                      {post.equityOffered != null && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equity</span>
                          <div style={{ fontSize: '0.92rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.9)', marginTop: '0.1rem' }}>
                            {post.equityOffered}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Show investment progress if approved */}
                    {hasFunding && post.approvedAmount > 0 && (
                      <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>Funding Commitment Progress</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: fundingPct >= 100 ? 'var(--accent-secondary)' : 'rgba(251,191,36,0.95)' }}>
                            {fundingPct}% Funded
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(fundingPct, 100)}%`,
                            height: '100%',
                            background: fundingPct >= 100
                              ? 'var(--accent-secondary)'
                              : 'linear-gradient(90deg, var(--accent-cyan), rgba(165,180,252,0.8))',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Demo video link */}
                    {post.demoVideoUrl && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                        <a href={post.demoVideoUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          🎬 Watch Demo Video ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Likes/Comments summary line */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      👍 {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
                    </span>
                    <span style={{ cursor: 'pointer' }} onClick={() => toggleComments(post.id)}>
                      💬 {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                    </span>
                  </div>

                  {/* Action Buttons: Like & Comment */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleLike(post.id)}
                      className="btn"
                      style={{
                        flex: 1,
                        margin: 0,
                        padding: '0.5rem',
                        background: post.hasLiked ? 'rgba(6,182,212,0.1)' : 'transparent',
                        border: '1px solid transparent',
                        color: post.hasLiked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        fontWeight: post.hasLiked ? '600' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        borderRadius: '6px',
                        transition: 'background 0.2s, color 0.2s, transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ fontSize: '1rem', display: 'inline-block', transform: post.hasLiked ? 'scale(1.15) rotate(-10deg)' : 'scale(1)', transition: 'transform 0.15s' }}>
                        👍
                      </span>
                      {post.hasLiked ? 'Liked' : 'Like'}
                    </button>
                    
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="btn"
                      style={{
                        flex: 1,
                        margin: 0,
                        padding: '0.5rem',
                        background: showCommentsDrawer ? 'rgba(255,255,255,0.03)' : 'transparent',
                        border: '1px solid transparent',
                        color: showCommentsDrawer ? '#fff' : 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        fontWeight: showCommentsDrawer ? '600' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>💬</span>
                      Comment
                    </button>
                  </div>

                  {/* Comment Section (Drawer) */}
                  {showCommentsDrawer && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-color)',
                      animation: 'fadeIn 0.25s ease-out'
                    }}>
                      {/* Comments List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem', maxStatus: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {comments.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                            No comments yet. Start the conversation!
                          </p>
                        ) : (
                          comments.map(c => (
                            <div key={c.id} style={{
                              background: 'rgba(255,255,255,0.015)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: '8px',
                              padding: '0.65rem 0.85rem',
                              position: 'relative'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontWeight: '600', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                    {c.userName}
                                  </span>
                                  <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: '700',
                                    padding: '0.05rem 0.35rem',
                                    borderRadius: '8px',
                                    background: `${getRoleBadgeColor(c.userRole)}15`,
                                    color: getRoleBadgeColor(c.userRole),
                                    border: `1px solid ${getRoleBadgeColor(c.userRole)}20`,
                                    textTransform: 'uppercase'
                                  }}>
                                    {c.userRole}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    {formatDate(c.createdAt)}
                                  </span>
                                  {(currentUser?.role === 'Admin' || currentUser?.id === c.userId) && (
                                    <button
                                      onClick={() => handleCommentDelete(post.id, c.id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(239,68,68,0.5)',
                                        cursor: 'pointer',
                                        fontSize: '0.72rem',
                                        padding: '0 0.1rem',
                                        transition: 'color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-rejected)'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239,68,68,0.5)'}
                                      title="Delete comment"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                {c.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment Input Form */}
                      <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Write a comment..."
                          value={newCommentsText[post.id] || ''}
                          onChange={(e) => setNewCommentsText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          style={{ margin: 0, padding: '0.45rem 0.75rem', fontSize: '0.8rem', flex: 1, borderRadius: '8px' }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={!(newCommentsText[post.id] || '').trim()}
                          style={{ margin: 0, padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderRadius: '8px' }}
                        >
                          Post
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Platform Social Updates & Investor Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Recent Investments activity feed card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              🚀 Funding Activities
            </h3>
            
            {activities.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No funding transactions yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activities.map(act => (
                  <div key={act.id} style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1rem' }}>💸</span>
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{act.investorName}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> committed </span>
                        <span style={{ fontWeight: '600', color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(act.committedAmount)}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> to </span>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>"{act.proposalTitle}"</span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {formatDate(act.investedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Social Platform Tips Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(6,182,212,0.01))',
            border: '1px solid rgba(6,182,212,0.15)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
              💡 Collaboration tip
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Leave comments on draft-stage or reviewed proposals in the social feed to offer technical feedback, suggest feature improvements, or alignment pointers.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
