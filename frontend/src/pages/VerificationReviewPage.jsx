import { useEffect, useState } from 'react';
import { api } from '../services/api';

function StatusBadge({ status }) {
  const map = {
    Pending: { color: '#f59e0b', icon: '⏳' },
    Verified: { color: '#10b981', icon: '✓' },
    Rejected: { color: '#ef4444', icon: '✗' },
  };
  const { color, icon } = map[status] || { color: '#94a3b8', icon: '—' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.75rem', fontWeight: 700, color,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '0.2rem 0.65rem'
    }}>
      {icon} {status}
    </span>
  );
}

function ReviewModal({ type, item, onClose, onAction }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (action) => {
    setSubmitting(true);
    try {
      const targetId = type === 'patent' ? item.startupId : item.id;
      await onAction(type, targetId, action, notes);
      onClose();
    } finally { setSubmitting(false); }
  };

  const isFounder = type === 'founder';
  const isPatent = type === 'patent';
  
  const title = isFounder
    ? `${item.user?.fullName || 'User'} — Founder Verification`
    : isPatent
    ? `${item.startup?.startupName || item.startup?.title || 'Startup'} — Patent Verification`
    : `${item.startup?.startupName || item.startup?.title || 'Startup'} — Startup Documents`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '90%', maxWidth: 560, padding: '2rem',
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Submitted for admin review
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
        </div>

        {/* Detail fields */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
          {isFounder ? (
            <>
              <DetailRow label="Verification Level" value={item.verificationLevel} />
              <DetailRow label="Email" value={item.user?.email} />
              <DetailRow label="PAN Number" value={item.panNumber} verifyUrl="https://eportal.incometax.gov.in/iec/foservices/#/pre-login/verifyYourPAN" verifyLabel="Verify PAN" />
              <DetailRow label="Aadhaar Number" value={item.aadhaarNumber ? `${item.aadhaarNumber.slice(0,4)} XXXX XXXX` : null} verifyUrl="https://myaadhaar.uidai.gov.in/" verifyLabel="Verify Aadhaar" />
              <DetailRow label="LinkedIn" value={item.linkedInUrl} link />
              <DetailRow label="GST Number" value={item.gstNumber} verifyUrl="https://services.gst.gov.in/services/searchtp" verifyLabel="Verify GST" />
              <DetailRow label="Registration No." value={item.registrationNumber} verifyUrl="https://www.mca.gov.in/mcafoportal/viewCompanyOrLLPDetails.html" verifyLabel="Verify Co Reg" />
              <DetailRow label="CIN Number" value={item.cinNumber} verifyUrl="https://www.mca.gov.in/mcafoportal/viewCompanyOrLLPDetails.html" verifyLabel="Verify CIN" />
              <DetailRow label="Document Bundle" value={item.documentUrl} link />
              <DetailRow label="Notes from Founder" value={item.notes} />
            </>
          ) : isPatent ? (
            <>
              <DetailRow label="Startup" value={item.startup?.startupName || item.startup?.title} />
              <DetailRow label="Patent Status" value={item.patentStatus} />
              <DetailRow label="Patent Number" value={item.patentNumber} verifyUrl={item.patentNumber && item.patentNumber.startsWith('20') ? "https://iprsearch.ipindia.gov.in/publicsearch" : "https://ppubs.uspto.gov/pubwebapp/"} verifyLabel="Verify Patent" />
              <DetailRow label="Filing Date" value={item.filingDate ? new Date(item.filingDate).toLocaleDateString('en-IN') : null} />
              <DetailRow label="Patent Document" value={item.patentDocumentUrl} link />
            </>
          ) : (
            <>
              <DetailRow label="Startup" value={item.startup?.startupName || item.startup?.title} />
              <DetailRow label="Registration Certificate" value={item.registrationCertificateUrl} link />
              <DetailRow label="GST Document" value={item.gstDocumentUrl} link />
              <DetailRow label="PAN Document" value={item.panDocumentUrl} link />
              <DetailRow label="Financial Statements" value={item.financialStatementsUrl} link />
              <DetailRow label="Pitch Deck" value={item.pitchDeckUrl} link />
              <DetailRow label="Notes" value={item.notes} />
            </>
          )}
        </div>

        {/* Reviewer notes */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Review Notes (reason for approval/rejection)
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Add your review comments here…"
            style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn"
            style={{ flex: 1, background: '#ef4444', color: 'var(--text-primary)', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => handleAction('reject')} disabled={submitting}
          >
            {submitting ? '…' : '✗ Reject'}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => handleAction('approve')} disabled={submitting}
          >
            {submitting ? '…' : '✓ Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, link, verifyUrl, verifyLabel }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {link ? (
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>
            {value.length > 50 ? `${value.slice(0, 50)}…` : value} ↗
          </a>
        ) : (
          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</span>
        )}
        {verifyUrl && (
          <a href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{
            fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', padding: '0.1rem 0.4rem',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center'
          }}>
            🔍 {verifyLabel || 'Verify Registry'} ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function VerificationReviewPage({ user }) {
  const [founders, setFounders] = useState([]);
  const [startups, setStartups] = useState([]);
  const [patents, setPatents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewType, setReviewType] = useState(null);
  const [activeTab, setActiveTab] = useState('founders');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/verification/admin/pending');
      setFounders(data.founders ?? []);
      setStartups(data.startups ?? []);
      setPatents(data.patents ?? []);
    } catch (err) {
      console.error('Failed to load verifications', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (type, id, action, notes) => {
    let endpoint;
    let payload = { notes };
    if (type === 'founder') {
      endpoint = `/verification/admin/${action}/founder/${id}`;
    } else if (type === 'startup') {
      endpoint = `/verification/admin/${action}/startup/${id}`;
    } else if (type === 'patent') {
      endpoint = `/PatentInfo/verify/${id}`;
      payload = { status: action === 'approve' ? 'Verified' : 'Rejected' };
    }

    try {
      await api.post(endpoint, payload);
      setMessage({ type: 'success', text: `${type === 'founder' ? 'Founder' : type === 'startup' ? 'Startup' : 'Patent'} ${action === 'approve' ? 'approved' : 'rejected'} successfully.` });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Action failed.' });
      throw err;
    }
  };

  const openReview = (type, item) => { setReviewType(type); setReviewItem(item); };

  const tabs = [
    { id: 'founders', label: `Founder Requests (${founders.length})` },
    { id: 'startups', label: `Startup Documents (${startups.length})` },
    { id: 'patents', label: `Patent Registry (${patents.length})` },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>🔎 Verification Review Queue</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
        Review and verify founder identity & startup document submissions. Verified records boost Trust Scores.
      </p>

      {message && (
        <div style={{
          padding: '0.7rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
          background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: message.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.88rem'
        }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? 'rgba(6,182,212,0.15)' : 'transparent',
              border: activeTab === t.id ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
              borderRadius: 8, padding: '0.45rem 1rem', cursor: 'pointer',
              color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.88rem', fontWeight: activeTab === t.id ? 700 : 400
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading pending verifications…</div>
      ) : activeTab === 'founders' ? (
        founders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            No pending founder verifications.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {founders.map(f => (
              <div key={f.id} style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '1.1rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.user?.fullName || 'Unknown Founder'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {f.user?.email} · Level: <strong>{f.verificationLevel}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusBadge status={f.status || 'Pending'} />
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', margin: 0 }}
                    onClick={() => openReview('founder', f)}>
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'startups' ? (
        startups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            No pending startup verifications.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {startups.map(s => (
              <div key={s.id} style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '1.1rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {s.startup?.startupName || s.startup?.title || `Proposal #${s.startupId}`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Proposal ID: {s.startupId}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusBadge status={s.overallStatus || 'Pending'} />
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', margin: 0 }}
                    onClick={() => openReview('startup', s)}>
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        patents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            No pending patent verifications.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {patents.map(p => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '1.1rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.startup?.startupName || p.startup?.title || `Proposal #${p.startupId}`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Patent Number: <strong>{p.patentNumber || 'N/A'}</strong> · Status: <strong>{p.patentStatus}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusBadge status={p.verificationStatus || 'Pending'} />
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', margin: 0 }}
                    onClick={() => openReview('patent', p)}>
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {reviewItem && (
        <ReviewModal
          type={reviewType} item={reviewItem}
          onClose={() => { setReviewItem(null); setReviewType(null); }}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
