import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function ConsultationChat({ user, consultation, userRole, onStatusChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingError, setRatingError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const consultationId = consultation.id || consultation.Id;
  const isReviewer = userRole === 'Reviewer';
  const isCompleted = consultation.status === 'Completed';
  const isInactive = consultation.status === 'Cancelled' || consultation.status === 'Rejected' || consultation.status === 'Completed';

  useEffect(() => {
    fetchMessages();
    setRatingSubmitted(consultation.rating > 0);
    if (consultation.rating > 0) {
      setRating(consultation.rating);
      setFeedback(consultation.feedback || '');
    }

    // Set up polling for new messages every 3 seconds
    const interval = setInterval(() => {
      if (pollingActive && !isInactive) {
        fetchMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [consultationId, pollingActive, consultation.status]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const data = await api.get(`/consultation/${consultationId}/messages`);
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load consultation messages', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isInactive) return;

    const text = input;
    setInput('');

    try {
      await api.post(`/consultation/${consultationId}/messages`, {
        content: text
      });
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isInactive) return;

    setUploading(true);
    try {
      const uploadResult = await api.upload('/files/upload', file);
      
      // Send message with file metadata
      await api.post(`/consultations/${consultationId}/messages`, {
        content: `Sent a file: ${file.name}`,
        fileUrl: uploadResult.filePath,
        fileName: file.name,
        fileType: file.type
      });
      
      await fetchMessages();
    } catch (err) {
      alert(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    setRatingError(null);
    try {
      await api.post(`/consultation/${consultationId}/rate`, {
        rating: parseInt(rating),
        feedback: feedback.trim()
      });
      setRatingSubmitted(true);
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      setRatingError(err.message || 'Failed to submit rating.');
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
      
      {/* Header Info */}
      <div style={{ 
        padding: '1rem 1.25rem', 
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {consultation.consultationType || consultation.ConsultationType}
          </span>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 600 }}>
            {consultation.subject || consultation.Subject}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {consultation.description || consultation.Description}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span 
            className="badge" 
            style={{ 
              background: `${getStatusColor(consultation.status)}18`,
              border: `1px solid ${getStatusColor(consultation.status)}44`,
              color: getStatusColor(consultation.status),
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {consultation.status}
          </span>
        </div>
      </div>

      {/* Messages Scroll Panel */}
      <div style={{ 
        flex: 1, 
        padding: '1.25rem', 
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</span>
            <p style={{ fontSize: '0.85rem' }}>No messages yet. Send a message to start the consultation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id || msg.SenderId === user.id;
            let roleBadgeText = '';
            let roleColor = 'var(--text-muted)';
            const role = msg.senderRole || msg.SenderRole;

            if (role === 'Admin') {
              roleBadgeText = 'Admin';
              roleColor = 'var(--color-rejected)';
            } else if (role === 'Reviewer') {
              roleBadgeText = 'Expert';
              roleColor = 'var(--accent-primary)';
            } else if (role === 'Submitter' || role === 'Founder') {
              roleBadgeText = 'Founder';
              roleColor = 'var(--accent-secondary)';
            } else if (role === 'Investor') {
              roleBadgeText = 'Investor';
              roleColor = 'var(--accent-cyan)';
            }

            return (
              <div 
                key={msg.id} 
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Sender Title Bar */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '3px', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {isMe ? 'You' : (msg.senderName || msg.SenderName)}
                  </span>
                  {roleBadgeText && (
                    <span style={{ 
                      fontSize: '0.55rem', 
                      padding: '0.05rem 0.35rem', 
                      borderRadius: '4px', 
                      background: `${roleColor}15`, 
                      border: `1px solid ${roleColor}33`, 
                      color: roleColor, 
                      fontWeight: 700, 
                      textTransform: 'uppercase' 
                    }}>
                      {roleBadgeText}
                    </span>
                  )}
                </div>

                {/* Bubble content */}
                <div style={{
                  background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border-color)',
                  padding: '0.75rem 1rem',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  {msg.content || msg.Content}

                  {/* Attachment rendering */}
                  {(msg.fileUrl || msg.FileUrl) && (
                    <div style={{ 
                      marginTop: '0.6rem', 
                      padding: '0.5rem', 
                      borderRadius: '6px', 
                      background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <span>📎</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          textOverflow: 'ellipsis', 
                          overflow: 'hidden', 
                          whiteSpace: 'nowrap',
                          color: isMe ? '#fff' : 'var(--accent-cyan)'
                        }}>
                          {msg.fileName || msg.FileName || 'Attachment'}
                        </span>
                      </div>
                      <a 
                        href={`http://localhost:5031${msg.fileUrl || msg.FileUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 600, 
                          color: isMe ? '#fff' : 'var(--accent-primary)',
                          textDecoration: 'underline' 
                        }}
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {new Date(msg.sentAt || msg.SentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Complete Ratings Card (Founder/Investor view only) */}
      {isCompleted && !isReviewer && (
        <div style={{ 
          padding: '1.25rem', 
          borderTop: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.08))',
          textAlign: 'center'
        }}>
          {!ratingSubmitted ? (
            <form onSubmit={submitRating}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                🌟 Rate this Consultation
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                How would you rate the expert guidance and feedback provided by this reviewer?
              </p>
              {ratingError && <p style={{ color: 'var(--color-rejected)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{ratingError}</p>}
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '1.5rem', color: val <= rating ? '#fbbf24' : 'var(--border-hover)',
                      transition: 'transform 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ★
                  </button>
                ))}
              </div>

              <input 
                type="text" 
                className="form-input" 
                placeholder="Optional feedback remarks (e.g. Very helpful, clear feedback)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{ width: '100%', marginBottom: '0.75rem', fontSize: '0.8rem', padding: '0.45rem' }}
              />

              <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem', margin: 0 }}>
                Submit Review
              </button>
            </form>
          ) : (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-approved)', fontWeight: 600, marginBottom: '0.25rem' }}>
                ✅ Feedback Submitted
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Thank you for your rating of **{rating}/5 stars**. Your feedback helps maintain high-quality advisory services.
              </p>
              {feedback && (
                <p style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  "{feedback}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input panel */}
      {!isInactive ? (
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          {/* File attachment upload trigger */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <button 
            type="button" 
            className="icon-btn" 
            title="Attach Supporting File"
            onClick={triggerUploadClick}
            disabled={uploading}
            style={{ width: '38px', height: '38px', borderRadius: '8px', margin: 0, flexShrink: 0 }}
          >
            {uploading ? '⌛' : '📎'}
          </button>

          <form onSubmit={handleSend} style={{ display: 'flex', flex: 1, gap: '0.5rem', margin: 0 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, margin: 0, height: '38px', borderRadius: '8px', padding: '0.5rem 1rem' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!input.trim()}
              style={{ margin: 0, height: '38px', borderRadius: '8px', padding: '0 1.25rem' }}
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        !isCompleted && (
          <div style={{ 
            padding: '1rem', 
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem'
          }}>
            🚫 This consultation is closed ({consultation.status}). Messages cannot be sent.
          </div>
        )
      )}
    </div>
  );
}
