import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ConsultationChat from '../components/ConsultationChat';
import ConsultationRequestModal from '../components/ConsultationRequestModal';

export default function ConsultationHub({ user, userRole, setCurrentTab }) {
  const [consultations, setConsultations] = useState([]);
  const [remainingConsultations, setRemainingConsultations] = useState(5);
  const [totalConsultations, setTotalConsultations] = useState(5);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [reviewerActionLoading, setReviewerActionLoading] = useState(null);

  const isReviewer = userRole === 'Reviewer';

  useEffect(() => {
    fetchConsultations();
  }, [userRole]);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      if (isReviewer) {
        // Reviewer endpoint
        const data = await api.get('/reviewer/consultations');
        setConsultations(Array.isArray(data) ? data : []);
      } else {
        // User endpoint
        const data = await api.get('/consultation/my');
        setConsultations(data.consultations || []);
        setRemainingConsultations(data.remainingConsultations);

        // Load sub details for total limit
        const subData = await api.get('/subscription/my');
        if (subData.hasActive && subData.data) {
          setTotalConsultations(subData.data.totalReviewerConsultations || subData.data.TotalReviewerConsultations || 5);
        }
      }
    } catch (err) {
      console.error('Failed to load consultations list', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this consultation request?')) return;

    setCancellingId(id);
    try {
      await api.post(`/consultations/${id}/cancel`);
      await fetchConsultations();
      // If we are looking at the cancelled consultation, refresh it
      if (selectedConsultation && (selectedConsultation.id === id || selectedConsultation.Id === id)) {
        setSelectedConsultation(prev => ({ ...prev, status: 'Cancelled' }));
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel consultation.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReviewerAction = async (e, id, action) => {
    e.stopPropagation();
    let confirmMsg = '';
    if (action === 'accept') confirmMsg = 'Are you sure you want to accept this consultation request?';
    if (action === 'reject') confirmMsg = 'Are you sure you want to decline this consultation request?';
    if (action === 'complete') confirmMsg = 'Are you sure you want to mark this consultation as completed? This will deduct one consultation from the user\'s quota.';

    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setReviewerActionLoading(id);
    try {
      await api.post(`/reviewer/consultations/${id}/${action}`);
      await fetchConsultations();
      // If we are looking at this consultation, refresh it
      if (selectedConsultation && (selectedConsultation.id === id || selectedConsultation.Id === id)) {
        const newStatus = action === 'accept' ? 'Accepted' : action === 'reject' ? 'Rejected' : 'Completed';
        setSelectedConsultation(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.message || `Failed to ${action} consultation.`);
    } finally {
      setReviewerActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'badge-submitted';
      case 'Accepted': return 'badge-underreview';
      case 'InProgress': return 'badge-reviewed';
      case 'Completed': return 'badge-approved';
      case 'Cancelled': return 'badge-draft';
      case 'Rejected': return 'badge-rejected';
      default: return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'var(--color-submitted)';
      case 'Accepted': return 'var(--color-underreview)';
      case 'InProgress': return 'var(--color-reviewed)';
      case 'Completed': return 'var(--color-approved)';
      case 'Cancelled': return 'var(--color-draft)';
      case 'Rejected': return 'var(--color-rejected)';
      default: return 'var(--text-muted)';
    }
  };

  const selectConsultation = (c) => {
    setSelectedConsultation(c);
  };

  return (
    <div className="page-container">
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>{isReviewer ? 'Expert Advisory Workspace' : 'Reviewer Consultation Hub'}</h2>
          <p>
            {isReviewer 
              ? 'Manage pending requests and conduct 1-on-1 consultations with premium members.' 
              : 'Schedule and engage in 1-on-1 consultations with verified expert reviewers.'}
          </p>
        </div>
        {!isReviewer && (
          <button 
            className="btn btn-primary"
            style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4)', border: 'none', margin: 0, padding: '0.6rem 1.25rem' }}
            onClick={() => {
              if (remainingConsultations <= 0) {
                alert('You have exhausted your reviewer consultation limit for the current cycle.');
              } else {
                setShowRequestModal(true);
              }
            }}
          >
            📞 Request Consultation
          </button>
        )}
      </div>

      {/* Quota Alert/Info Card (Only for Founders/Investors) */}
      {!isReviewer && (
        <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '0' }}>
          <div 
            className="metric-card"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              marginBottom: '1.5rem'
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reviewer Consultation Quota</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Your Premium subscription grants you expert reviews. Quota resets with subscription renewal.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {remainingConsultations}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                /{totalConsultations}
              </span>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                Remaining Consultations
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="dashboard-columns">
        
        {/* Left Column: Requests List */}
        <div>
          <div className="table-card" style={{ height: '100%', minHeight: '400px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3>{isReviewer ? 'Consultation Request Queue' : 'My Consultations'}</h3>
            </div>
            
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ width: '30px', height: '30px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : consultations.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>
                  {isReviewer ? 'No active consultation requests assigned or pending in queue.' : 'You have not requested any consultations yet.'}
                </p>
                {!isReviewer && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                    onClick={() => setShowRequestModal(true)}
                  >
                    Create First Request
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                <table className="governance-table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '1rem' }}>Subject</th>
                      <th>{isReviewer ? 'Premium Member / Startup' : 'Expert / Startup'}</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c) => {
                      const isSelected = selectedConsultation && (selectedConsultation.id === c.id || selectedConsultation.Id === c.id);
                      const displayTitle = c.subject || c.Subject;
                      const displayType = c.consultationType || c.ConsultationType;
                      const displayDate = c.requestedAt || c.RequestedAt;
                      
                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => selectConsultation(c)} 
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ paddingLeft: '1rem' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{displayTitle}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {displayType} • {new Date(displayDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                              👤 {isReviewer ? (c.userName || 'Premium User') : (c.reviewerName || 'Unassigned')}
                            </div>
                            {c.startupTitle && c.startupTitle !== 'N/A' && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                                🚀 {c.startupTitle}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              
                              {/* User actions */}
                              {!isReviewer && (
                                <>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0 }}
                                    onClick={() => selectConsultation(c)}
                                  >
                                    Chat
                                  </button>
                                  {(c.status === 'Pending' || c.status === 'Accepted' || c.status === 'InProgress') && (
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0, color: 'var(--color-rejected)' }}
                                      onClick={(e) => handleCancel(e, c.id)}
                                      disabled={cancellingId === c.id}
                                    >
                                      {cancellingId === c.id ? '...' : 'Cancel'}
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Reviewer actions */}
                              {isReviewer && (
                                <>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0 }}
                                    onClick={() => selectConsultation(c)}
                                  >
                                    View
                                  </button>
                                  
                                  {c.status === 'Pending' && (
                                    <>
                                      <button 
                                        className="btn btn-primary" 
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0, background: 'var(--color-approved)', borderColor: 'var(--color-approved)' }}
                                        onClick={(e) => handleReviewerAction(e, c.id, 'accept')}
                                        disabled={reviewerActionLoading === c.id}
                                      >
                                        Accept
                                      </button>
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0, color: 'var(--color-rejected)', borderColor: 'var(--color-rejected)' }}
                                        onClick={(e) => handleReviewerAction(e, c.id, 'reject')}
                                        disabled={reviewerActionLoading === c.id}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {(c.status === 'Accepted' || c.status === 'InProgress') && (
                                    <button 
                                      className="btn btn-success" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', margin: 0, background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                                      onClick={(e) => handleReviewerAction(e, c.id, 'complete')}
                                      disabled={reviewerActionLoading === c.id}
                                    >
                                      Complete
                                    </button>
                                  )}
                                </>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Panel */}
        <div>
          {selectedConsultation ? (
            <div className="detail-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px', overflow: 'hidden' }}>
              <ConsultationChat 
                user={user} 
                consultation={selectedConsultation} 
                userRole={userRole} 
                onStatusChanged={() => {
                  fetchConsultations();
                }}
              />
            </div>
          ) : (
            <div className="detail-card text-center" style={{ padding: '5rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📞</span>
              <h3>No Consultation Selected</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                Select a consultation request from the table to view the messaging board, share files, or submit review feedback.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <ConsultationRequestModal 
          user={user}
          userRole={userRole}
          onClose={() => setShowRequestModal(false)}
          onRequestSubmitted={() => {
            fetchConsultations();
            alert('Consultation request filed successfully!');
          }}
        />
      )}
    </div>
  );
}
