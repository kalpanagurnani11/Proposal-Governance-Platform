import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

// ─── Trust Score Ring ────────────────────────────────────────────────────────
function TrustRing({ score }) {
  const r = 44, circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#f97316' : '#ef4444';
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color})` }} />
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="monospace">{score}</text>
      <text x="55" y="67" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">TRUST</text>
    </svg>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    Verified: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)', icon: '✓' },
    Pending:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', icon: '⏳' },
    Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', icon: '✕' },
    NA:       { bg: 'rgba(100,116,139,0.12)', color: '#64748b', border: 'rgba(100,116,139,0.2)', icon: '—' },
  };
  const s = map[status] || map.NA;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize:'0.75rem', fontWeight:700 }}>
      {s.icon} {status}
    </span>
  );
}

export default function VerificationPage({ proposalId, proposalTitle, onBack }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    panNumber: '', aadhaarLast4: '', gstNumber: '', cinNumber: '', patentNumber: ''
  });

  useEffect(() => { fetchRecord(); }, [proposalId]);

  const fetchRecord = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/verification/my/${proposalId}`);
      if (data) {
        setRecord(data);
        setForm({
          panNumber: data.panNumber || '',
          aadhaarLast4: data.aadhaarLast4 || '',
          gstNumber: data.gstNumber || '',
          cinNumber: data.cinNumber || '',
          patentNumber: data.patentNumber || ''
        });
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.panNumber) { setErrorMsg('PAN Number is required for identity verification.'); return; }
    setSubmitting(true); setErrorMsg(''); setSuccessMsg('');
    try {
      await api.post('/verification/submit', { proposalId, ...form });
      setSuccessMsg('Verification data submitted! Admin will cross-check with government portals.');
      fetchRecord();
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const GOV_LINKS = [
    { label: 'PAN Verification', url: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1#pancard', icon: '🏛️', color: '#6366f1', desc: 'Income Tax Department — Validate PAN card holder identity' },
    { label: 'Aadhaar Verify', url: 'https://myaadhaar.uidai.gov.in/', icon: '🆔', color: '#06b6d4', desc: 'UIDAI — Official Aadhaar verification portal' },
    { label: 'GST Search', url: 'https://www.gst.gov.in/commonfunction/searchtaxpayer', icon: '🧾', color: '#10b981', desc: 'GST Portal — Search taxpayer by GSTIN number' },
    { label: 'MCA CIN Lookup', url: 'https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do', icon: '🏢', color: '#f59e0b', desc: 'Ministry of Corporate Affairs — Company master data' },
    { label: 'Patent Search (IPIndia)', url: 'https://ipindiaservices.gov.in/PatentSearch/PatentSearch/ViewApplicationStatus', icon: '⚗️', color: '#a855f7', desc: 'IP India — Patent application status and registry' },
    { label: 'Startup India DPIIT', url: 'https://www.startupindia.gov.in/content/sih/en/startupgov/about-startup-recognition.html', icon: '🚀', color: '#ec4899', desc: 'DPIIT — Startup recognition and certification' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'2rem' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-color)', color:'var(--text-secondary)', borderRadius:8, padding:'0.4rem 0.9rem', cursor:'pointer', fontSize:'0.85rem' }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin:0, fontSize:'1.4rem' }}>🛡️ Identity & Business Verification</h2>
          <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-muted)', marginTop:2 }}>{proposalTitle}</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        {/* LEFT: Form */}
        <div>
          <div className="table-card" style={{ padding:'1.5rem' }}>
            <div style={{ marginBottom:'1.25rem' }}>
              <h3 style={{ margin:0, fontSize:'1rem', color:'var(--text-primary)' }}>Submit Verification Documents</h3>
              <p style={{ margin:'0.3rem 0 0', fontSize:'0.78rem', color:'var(--text-muted)' }}>
                Provide your government-registered identifiers. An admin will manually cross-verify against official portals.
              </p>
            </div>

            {successMsg && (
              <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#10b981', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'0.83rem' }}>
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', padding:'0.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'0.83rem' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* PAN */}
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ background:'rgba(99,102,241,0.15)', color:'#6366f1', borderRadius:6, padding:'2px 7px', fontSize:'0.7rem', fontWeight:700 }}>MANDATORY</span>
                  PAN Number <span style={{ color:'#ef4444' }}>*</span>
                </label>
                <input className="form-input" placeholder="ABCDE1234F" maxLength={10}
                  value={form.panNumber} onChange={e => setForm({...form, panNumber: e.target.value.toUpperCase()})} />
                <small style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>
                  10-character alphanumeric — verified via Income Tax Dept portal
                </small>
              </div>

              {/* Aadhaar Last 4 */}
              <div className="form-group">
                <label>Aadhaar Last 4 Digits</label>
                <input className="form-input" placeholder="XXXX" maxLength={4} type="text"
                  value={form.aadhaarLast4} onChange={e => setForm({...form, aadhaarLast4: e.target.value.replace(/\D/g,'')})} />
                <small style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>
                  Only last 4 digits stored — verified via UIDAI myAadhaar portal
                </small>
              </div>

              {/* GST */}
              <div className="form-group">
                <label>GSTIN Number <span style={{ color:'var(--text-muted)', fontSize:'0.7rem' }}>(if registered)</span></label>
                <input className="form-input" placeholder="22AAAAA0000A1Z5" maxLength={15}
                  value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value.toUpperCase()})} />
                <small style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>
                  15-digit GSTIN — verified via GST Portal taxpayer search
                </small>
              </div>

              {/* CIN */}
              <div className="form-group">
                <label>CIN / LLPIN <span style={{ color:'var(--text-muted)', fontSize:'0.7rem' }}>(Company Registration)</span></label>
                <input className="form-input" placeholder="U12345MH2020PTC123456"
                  value={form.cinNumber} onChange={e => setForm({...form, cinNumber: e.target.value.toUpperCase()})} />
                <small style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>
                  MCA CIN — verified via Ministry of Corporate Affairs
                </small>
              </div>

              {/* Patent */}
              <div className="form-group">
                <label>Patent Application Number <span style={{ color:'var(--text-muted)', fontSize:'0.7rem' }}>(if applicable)</span></label>
                <input className="form-input" placeholder="202321012345"
                  value={form.patentNumber} onChange={e => setForm({...form, patentNumber: e.target.value})} />
                <small style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>
                  IP India patent number — verified via IPIndia registry
                </small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}
                style={{ justifyContent:'center', marginTop:'0.5rem' }}>
                {submitting ? 'Submitting...' : '🔐 Submit for Government Verification'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Status + Gov links */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          {/* Trust Score */}
          <div className="table-card" style={{ padding:'1.5rem', textAlign:'center' }}>
            <h4 style={{ margin:'0 0 1rem', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>
              Platform Trust Score
            </h4>
            <TrustRing score={record?.trustScore ?? 0} />
            <p style={{ margin:'0.75rem 0 0', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
              {record ? 'Based on verified government identifiers' : 'Submit verification documents to generate score'}
            </p>

            {record && (
              <div style={{ marginTop:'1.25rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                {[
                  { label:'PAN / Identity', status: record.panStatus },
                  { label:'GST Registration', status: record.gstStatus },
                  { label:'CIN / Company', status: record.cinStatus },
                  { label:'Patent / IP', status: record.patentStatus },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0.75rem', background:'rgba(255,255,255,0.03)', borderRadius:6 }}>
                    <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{item.label}</span>
                    <StatusPill status={item.status || 'Pending'} />
                  </div>
                ))}
              </div>
            )}

            {record?.adminNotes && (
              <div style={{ marginTop:'1rem', padding:'0.75rem', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, textAlign:'left' }}>
                <div style={{ fontSize:'0.7rem', color:'#6366f1', fontWeight:700, marginBottom:4 }}>ADMIN NOTES</div>
                <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-secondary)' }}>{record.adminNotes}</p>
              </div>
            )}
          </div>

          {/* Government Verification Portals */}
          <div className="table-card" style={{ padding:'1.25rem' }}>
            <h4 style={{ margin:'0 0 1rem', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>
              🏛️ Official Government Portals
            </h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {GOV_LINKS.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0.75rem',
                    background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.07)`,
                    borderRadius:8, textDecoration:'none', transition:'all 0.2s',
                    borderLeft:`3px solid ${link.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${link.color}12`; e.currentTarget.style.transform = 'translateX(3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <span style={{ fontSize:'1.1rem' }}>{link.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>{link.label}</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{link.desc}</div>
                  </div>
                  <span style={{ color:'var(--text-muted)', fontSize:'0.7rem' }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
