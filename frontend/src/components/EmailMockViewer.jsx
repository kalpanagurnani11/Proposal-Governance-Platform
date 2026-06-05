import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function EmailMockViewer() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      const data = await api.get('/analytics/emails');
      setEmails(data);
      if (data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      }
    } catch (err) {
      console.error('Error fetching mock emails', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Poll for emails every 5 seconds to keep it fresh
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="table-card" style={{ marginTop: '2rem' }}>
      <div className="card-header flex-between">
        <div>
          <h3>Corporate Mail Simulator</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Simulates outgoing notifications dispatched by governance workflow steps.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEmails} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          Refresh Inbox
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '320px', background: 'rgba(0,0,0,0.1)' }}>
        {/* Inbox List */}
        <div style={{ borderRight: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: '400px' }}>
          {loading && emails.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Inbox...</p>
          ) : emails.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No emails dispatched yet.</p>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: selectedEmail?.id === email.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  transition: 'var(--transition-smooth)',
                  borderLeft: selectedEmail?.id === email.id ? '3px solid var(--accent-primary)' : '3px solid transparent'
                }}
              >
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                    To: {email.toEmail}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(email.sentAt)}
                  </span>
                </div>
                <h5 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  {email.subject}
                </h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.body}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Email Viewer */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '400px' }}>
          {selectedEmail ? (
            <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <strong>From:</strong> capital-governance-noreply@corporate.internal
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <strong>To:</strong> {selectedEmail.toEmail}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <strong>Sent:</strong> {new Date(selectedEmail.sentAt).toLocaleString()}
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.75rem' }}>
                  {selectedEmail.subject}
                </h4>
              </div>
              <div style={{
                whiteSpace: 'pre-line',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
                fontFamily: 'sans-serif',
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                {selectedEmail.body}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select an email to view contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
