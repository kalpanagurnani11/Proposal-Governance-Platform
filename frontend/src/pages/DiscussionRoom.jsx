import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  joinDiscussionRoom,
  leaveDiscussionRoom,
  subscribeToDiscussionMessages
} from '../services/signalr';

export default function DiscussionRoom({ user, discussionId, setDiscussionId }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Message input state
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState('text'); // 'text', 'question', 'file'
  const [fileUrl, setFileUrl] = useState('');

  // Meeting scheduler modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [proposedTime, setProposedTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchRooms = async () => {
    try {
      const data = await api.get('/discussions');
      setRooms(data);
      
      // Auto-select room if discussionId was passed from Marketplace
      if (discussionId) {
        const matchingRoom = data.find(r => r.id === discussionId);
        if (matchingRoom) {
          handleSelectRoom(matchingRoom);
        } else {
          // If not in the list, fetch detail manually
          try {
            const detail = await api.get(`/discussions/${discussionId}`);
            setRooms(prev => [detail, ...prev]);
            handleSelectRoom(detail);
          } catch (err) {
            console.error('Error fetching room detail for ID:', discussionId, err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching discussion rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [discussionId]);

  // Handle SignalR connection for the active room
  useEffect(() => {
    if (!activeRoom) return;

    // Join room group
    joinDiscussionRoom(activeRoom.id);

    // Listen to real-time messages
    const unsubscribe = subscribeToDiscussionMessages((newMsg) => {
      if (newMsg.discussionId === activeRoom.id) {
        setMessages(prev => {
          // Check if it is an update to an existing message (like a meeting status update)
          const exists = prev.some(m => m.id === newMsg.id);
          if (exists) {
            return prev.map(m => m.id === newMsg.id ? newMsg : m);
          }
          return [...prev, newMsg];
        });
      }

      // Dynamically update rooms list order & last message time
      setRooms(prev => {
        return prev.map(r => {
          if (r.id === newMsg.discussionId) {
            return {
              ...r,
              lastMessageAt: newMsg.createdAt
            };
          }
          return r;
        }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    });

    return () => {
      leaveDiscussionRoom(activeRoom.id);
      unsubscribe();
    };
  }, [activeRoom]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectRoom = async (room) => {
    setDiscussionId(room.id); // synchronize with App.jsx state
    setActiveRoom(room);
    setLoadingMessages(true);
    setMessages([]);
    setContent('');
    setMessageType('text');
    setFileUrl('');
    try {
      const data = await api.get(`/discussions/${room.id}`);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || !activeRoom) return;

    if (messageType === 'file' && !fileUrl.trim()) {
      alert('Please provide a file URL.');
      return;
    }

    try {
      await api.post(`/discussions/${activeRoom.id}/messages`, {
        content: content.trim(),
        messageType,
        fileUrl: messageType === 'file' ? fileUrl.trim() : null
      });
      setContent('');
      setFileUrl('');
      setMessageType('text');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleProposeMeeting = async (e) => {
    e.preventDefault();
    if (!proposedTime || !meetingLink.trim() || !activeRoom) return;

    setSubmittingMeeting(true);
    try {
      await api.post(`/discussions/${activeRoom.id}/meeting`, {
        proposedTime: new Date(proposedTime).toISOString(),
        meetingLink: meetingLink.trim(),
        notes: meetingNotes.trim() || 'Meeting request proposed.'
      });
      setShowMeetingModal(false);
      setProposedTime('');
      setMeetingLink('');
      setMeetingNotes('');
    } catch (err) {
      console.error('Error proposing meeting:', err);
      alert('Failed to propose meeting. Make sure link and time are valid.');
    } finally {
      setSubmittingMeeting(false);
    }
  };

  const handleMeetingResponse = async (msgId, response) => {
    if (!activeRoom) return;
    try {
      await api.put(`/discussions/${activeRoom.id}/meeting/${msgId}/respond`, {
        response
      });
    } catch (err) {
      console.error('Error responding to meeting:', err);
      alert('Failed to respond to meeting request.');
    }
  };

  const fmtCurrency = (val) => {
    return (val ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const formatMessageTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 100px)', padding: '1rem', display: 'flex', gap: '1rem', maxWidth: '1400px' }}>
      
      {/* Left Sidebar: Conversations list */}
      <div style={{
        width: '320px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            💬 PRIVATE CHATS
          </h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingRooms ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>Loading conversations...</p>
          ) : rooms.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
              No private discussions opened yet. Browse proposals in the Marketplace to open a discussion.
            </p>
          ) : (
            rooms.map(room => {
              const isActive = activeRoom && activeRoom.id === room.id;
              return (
                <div
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(165, 180, 252, 0.9)' }}>
                      🚀 {room.startupName}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {new Date(room.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.88rem', fontWeight: '600', color: isActive ? '#fff' : 'var(--text-primary)' }}>
                    {room.proposalTitle}
                  </h4>
                  
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    With {room.otherUser?.fullName} ({room.otherUser?.role})
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: Chat Message Area */}
      <div style={{
        flex: 1,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {activeRoom ? (
          <>
            {/* Active Chat Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{activeRoom.proposalTitle}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Room with: <strong>{activeRoom.otherUser?.fullName}</strong> ({activeRoom.otherUser?.role})
                </span>
              </div>

              {/* Schedule meeting action trigger */}
              <button
                className="btn btn-secondary"
                onClick={() => setShowMeetingModal(true)}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', margin: 0 }}
              >
                📅 Schedule Meeting
              </button>
            </div>

            {/* Scrollable Message History */}
            <div style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(0,0,0,0.05)'
            }}>
              {loadingMessages ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '3rem' }}>Loading messages...</p>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '3rem', fontSize: '0.85rem' }}>
                  No messages in this chat yet. Ask a question or say hello!
                </p>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user.id;
                  
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        width: '100%',
                        animation: 'fadeIn 0.2s ease-out'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        background: isMe ? 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.035)',
                        border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                      }}>
                        {/* Message Metadata */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '0.35rem', gap: '1rem' }}>
                          <span style={{ fontWeight: '600' }}>
                            {isMe ? 'You' : msg.senderName}
                          </span>
                          <span>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Rendering Message Types */}
                        {msg.messageType === 'question' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '4px', padding: '0.1rem 0.35rem', marginBottom: '0.4rem', fontSize: '0.62rem', color: '#fbbf24', fontWeight: 'bold' }}>
                            ❓ QUESTION / Q&A
                          </div>
                        )}

                        {msg.messageType === 'file' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '4px', padding: '0.1rem 0.35rem', marginBottom: '0.4rem', fontSize: '0.62rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                            📎 FILE LINK SHARE
                          </div>
                        )}

                        {msg.messageType === 'meeting_request' ? (
                          // Meeting Proposal Card Content
                          <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            minWidth: '240px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1rem' }}>📅</span>
                              <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Meeting Request</strong>
                              <span className={`badge ${msg.meetingStatus === 'Accepted' ? 'badge-approved' : msg.meetingStatus === 'Declined' ? 'badge-rejected' : 'badge-underreview'}`} style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem', marginLeft: 'auto' }}>
                                {msg.meetingStatus}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                              <strong>Time:</strong> {new Date(msg.proposedTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                              <strong>Notes:</strong> {msg.content}
                            </div>

                            {/* Meeting Response Actions */}
                            {msg.meetingStatus === 'Pending' ? (
                              !isMe ? (
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                                  <button
                                    onClick={() => handleMeetingResponse(msg.id, 'accepted')}
                                    className="btn btn-success"
                                    style={{ flex: 1, padding: '0.2rem 0.5rem', fontSize: '0.72rem', margin: 0 }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleMeetingResponse(msg.id, 'declined')}
                                    className="btn btn-danger"
                                    style={{ flex: 1, padding: '0.2rem 0.5rem', fontSize: '0.72rem', margin: 0 }}
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontStyle: 'italic', marginTop: '0.4rem' }}>
                                  Awaiting response from other party...
                                </div>
                              )
                            ) : msg.meetingStatus === 'Accepted' ? (
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                <a
                                  href={msg.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary"
                                  style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '0.3rem',
                                    fontSize: '0.72rem',
                                    margin: 0,
                                    background: 'var(--accent-secondary)',
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none'
                                  }}
                                >
                                  🔗 Join Meeting (Zoom/Meet)
                                </a>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-rejected)', fontStyle: 'italic', marginTop: '0.4rem' }}>
                                This meeting request was declined.
                              </div>
                            )}
                          </div>
                        ) : (
                          // Standard Text or Q&A or File link
                          <>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </p>
                            
                            {msg.messageType === 'file' && msg.fileUrl && (
                              <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '0.78rem',
                                    color: isMe ? '#a5b4fc' : 'var(--accent-cyan)',
                                    textDecoration: 'underline',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  📎 View Attachment / Shared File Link ↗
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Controls Bar */}
            <form onSubmit={handleSendMessage} style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {/* Type toggle selector & File link URL input */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type:</span>
                {['text', 'question', 'file'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMessageType(type)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      margin: 0,
                      background: messageType === type ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)',
                      fontWeight: messageType === type ? '600' : 'normal',
                      textTransform: 'uppercase'
                    }}
                  >
                    {type === 'file' ? '📎 File Link' : type === 'question' ? '❓ Question' : '💬 Text'}
                  </button>
                ))}

                {messageType === 'file' && (
                  <input
                    type="url"
                    className="form-input"
                    placeholder="Paste File URL (e.g. Google Drive link)..."
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    style={{ margin: 0, padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, borderRadius: '4px' }}
                    required
                  />
                )}
              </div>

              {/* Message content and send */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={messageType === 'question' ? "Type your Q&A tagged question..." : messageType === 'file' ? "Type a description of the shared file..." : "Type your chat message..."}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ margin: 0, padding: '0.6rem 0.85rem', fontSize: '0.85rem', flex: 1, borderRadius: '6px' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!content.trim()}
                  style={{ margin: 0, padding: '0.6rem 1.25rem', fontSize: '0.85rem', borderRadius: '6px' }}
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            padding: '2rem'
          }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</span>
            <h3>No Active Conversation selected</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Select a conversation room from the left sidebar or launch one from the Marketplace.</p>
          </div>
        )}
      </div>

      {/* MEETING SCHEDULER MODAL */}
      {showMeetingModal && activeRoom && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📅 Propose Virtual Meeting
              </h3>
              <button className="modal-close" onClick={() => setShowMeetingModal(false)}>✕</button>
            </div>

            <form onSubmit={handleProposeMeeting}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Proposed Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={proposedTime}
                    onChange={e => setProposedTime(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Meeting Link (Zoom / Google Meet URL)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://zoom.us/j/..."
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Meeting Description / Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Let's discuss your financial projections and B2B client details."
                    value={meetingNotes}
                    onChange={e => setMeetingNotes(e.target.value)}
                    rows={3}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingMeeting}>
                  {submittingMeeting ? 'Submitting...' : 'Send Proposal'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
