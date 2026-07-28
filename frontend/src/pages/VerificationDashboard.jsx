import { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUS_COLORS = {
  Verified: 'var(--accent-secondary)',
  Pending: '#f59e0b',
  Rejected: 'var(--color-rejected)',
  Unverified: 'var(--text-secondary)',
};

function StatusBadge({ status }) {
  const icons = { Verified: '✓', Pending: '⏳', Rejected: '✗', Unverified: '—' };
  const color = STATUS_COLORS[status] || STATUS_COLORS.Unverified;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.75rem', fontWeight: 700, color,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '0.2rem 0.7rem'
    }}>
      {icons[status] || '—'} {status}
    </span>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)',
      borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem'
    }}>
      <h3 style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function VerificationDashboard({ user }) {
  const [proposals, setProposals] = useState([]);
  const [founderStatus, setFounderStatus] = useState(null);
  const [startupStatus, setStartupStatus] = useState(null);
  const [patentStatus, setPatentStatus] = useState(null);
  const [selectedProposalId, setSelectedProposalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Founder form
  const [founderForm, setFounderForm] = useState({
    verificationLevel: 'Basic',
    panNumber: '', aadhaarNumber: '', linkedInUrl: '',
    gstNumber: '', registrationNumber: '', cinNumber: '',
    documentUrl: '', notes: ''
  });

  // Startup form
  const [startupForm, setStartupForm] = useState({
    registrationCertificateUrl: '', gstDocumentUrl: '',
    panDocumentUrl: '', financialStatementsUrl: '',
    pitchDeckUrl: '', notes: ''
  });

  // Patent form & check states
  const [patentForm, setPatentForm] = useState({
    patentStatus: 'NoPatent',
    patentNumber: '',
    filingDate: '',
    patentDocumentUrl: ''
  });
  const [patentCheckResult, setPatentCheckResult] = useState(null);
  const [runningPatentCheck, setRunningPatentCheck] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [props, fStatus] = await Promise.all([
        api.get('/proposals'),
        api.get('/verification/founder/status'),
      ]);
      const list = Array.isArray(props) ? props : props.proposals ?? [];
      setProposals(list);
      setFounderStatus(fStatus);
      if (fStatus?.data) {
        const d = fStatus.data;
        setFounderForm(prev => ({
          ...prev,
          verificationLevel: d.verificationLevel || 'Basic',
          panNumber: d.panNumber || '',
          aadhaarNumber: d.aadhaarNumber || '',
          linkedInUrl: d.linkedInUrl || '',
          gstNumber: d.gstNumber || '',
          registrationNumber: d.registrationNumber || '',
          cinNumber: d.cinNumber || '',
          documentUrl: d.documentUrl || '',
          notes: d.notes || ''
        }));
      }
      if (list.length > 0 && !selectedProposalId) {
        const firstId = list[0].id ?? list[0].Id;
        setSelectedProposalId(String(firstId));
        await fetchStartupStatus(firstId);
        await fetchPatentStatus(firstId);
      }
    } catch (err) {
      console.error('Verification fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStartupStatus = async (proposalId) => {
    try {
      const s = await api.get(`/verification/startup/${proposalId}`);
      setStartupStatus(s);
      if (s?.data) {
        const d = s.data;
        setStartupForm(prev => ({
          ...prev,
          registrationCertificateUrl: d.registrationCertificateUrl || '',
          gstDocumentUrl: d.gstDocumentUrl || '',
          panDocumentUrl: d.panDocumentUrl || '',
          financialStatementsUrl: d.financialStatementsUrl || '',
          pitchDeckUrl: d.pitchDeckUrl || '',
          notes: d.notes || ''
        }));
      }
    } catch { setStartupStatus(null); }
  };

  const fetchPatentStatus = async (proposalId) => {
    try {
      const p = await api.get(`/PatentInfo/startup/${proposalId}`);
      setPatentStatus(p);
      if (p?.hasRecord && p?.data) {
        const d = p.data;
        setPatentForm({
          patentStatus: d.patentStatus || 'NoPatent',
          patentNumber: d.patentNumber || '',
          filingDate: d.filingDate ? d.filingDate.split('T')[0] : '',
          patentDocumentUrl: d.patentDocumentUrl || ''
        });
      } else {
        setPatentForm({
          patentStatus: 'NoPatent',
          patentNumber: '',
          filingDate: '',
          patentDocumentUrl: ''
        });
      }
      // Load automated check results
      try {
        const res = await api.get(`/PatentInfo/results/${proposalId}`);
        setPatentCheckResult(res);
      } catch {
        setPatentCheckResult(null);
      }
    } catch { 
      setPatentStatus(null); 
      setPatentCheckResult(null);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleProposalChange = async (e) => {
    const id = e.target.value;
    setSelectedProposalId(id);
    setStartupStatus(null);
    setPatentStatus(null);
    setPatentCheckResult(null);
    if (id) {
      await fetchStartupStatus(id);
      await fetchPatentStatus(id);
    }
  };

  const handleFounderSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMessage(null);
    try {
      await api.post('/verification/founder/submit', founderForm);
      setMessage({ type: 'success', text: 'Founder verification request submitted! Awaiting admin review.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Submission failed.' });
    } finally { setSubmitting(false); }
  };

  const handleStartupSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProposalId) return;
    setSubmitting(true); setMessage(null);
    try {
      await api.post('/verification/startup/submit', { ...startupForm, startupId: parseInt(selectedProposalId) });
      setMessage({ type: 'success', text: 'Startup documents submitted! Awaiting admin review.' });
      await fetchStartupStatus(selectedProposalId);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Submission failed.' });
    } finally { setSubmitting(false); }
  };

  const handlePatentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProposalId) return;
    setSubmitting(true); setMessage(null);
    try {
      await api.post('/PatentInfo/startup/submit', {
        ...patentForm,
        startupId: parseInt(selectedProposalId),
        filingDate: patentForm.filingDate ? new Date(patentForm.filingDate).toISOString() : null
      });
      setMessage({ type: 'success', text: 'Patent details submitted successfully!' });
      await fetchPatentStatus(selectedProposalId);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Patent details submission failed.' });
    } finally { setSubmitting(false); }
  };

  const handleRunPatentCheck = async () => {
    if (!selectedProposalId) return;
    setRunningPatentCheck(true); setMessage(null);
    try {
      const checkRes = await api.post(`/PatentInfo/check/${selectedProposalId}`);
      setPatentCheckResult(checkRes);
      setMessage({ type: 'success', text: 'Automated patent registry check completed!' });
      await fetchPatentStatus(selectedProposalId);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Automated patent registry search check failed.' });
    } finally { setRunningPatentCheck(false); }
  };

  const founderStatusVal = founderStatus?.data?.status || (founderStatus?.hasRecord ? 'Pending' : 'Unverified');
  const startupStatusVal = startupStatus?.data?.overallStatus || (startupStatus?.hasRecord ? 'Pending' : 'Unverified');
  const patentStatusVal = patentStatus?.data?.verificationStatus || (patentStatus?.hasRecord ? 'Pending' : 'Unverified');

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading verification data…</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        .vform-input { width: 100%; padding: 0.55rem 0.85rem; border-radius: 8px;
          border: 1px solid var(--border-color); background: rgba(15,23,42,0.6);
          color: var(--text-primary); font-size: 0.9rem; outline: none; box-sizing: border-box; }
        .vform-input:focus { border-color: var(--accent-cyan); box-shadow: 0 0 0 2px rgba(6,182,212,0.2); }
        .vform-label { font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase;
          letter-spacing: 0.05em; margin-bottom: 0.3rem; display: block; }
        .vform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .vstat-row { display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.88rem; }
        .vstat-row:last-child { border-bottom: none; }
      `}</style>

      <h2 style={{ marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Verification Centre</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
        Submit your identity and startup documents for admin review. Verified status boosts your Trust Score.
      </p>

      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
          background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: message.type === 'success' ? 'var(--accent-secondary)' : 'var(--color-rejected)',
          border: `1px solid ${message.type === 'success' ? 'var(--accent-secondary)' : 'var(--color-rejected)'}40`,
          fontSize: '0.9rem'
        }}>
          {message.text}
        </div>
      )}

      {/* === FOUNDER VERIFICATION === */}
      <SectionCard title="Founder Identity Verification" icon="👤">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Current Status</span>
          <StatusBadge status={founderStatusVal} />
        </div>

        {founderStatusVal === 'Verified' ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-secondary)' }}>
            <div style={{ fontSize: '2.5rem' }}>✅</div>
            <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>Identity Verified</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Verification Level: <strong>{founderStatus?.data?.verificationLevel}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFounderSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="vform-label">Verification Level</label>
              <select className="vform-input" value={founderForm.verificationLevel}
                onChange={e => setFounderForm(p => ({ ...p, verificationLevel: e.target.value }))}>
                <option value="Basic">Basic (Email + Mobile)</option>
                <option value="Verified">Verified (Basic + PAN + Aadhaar + LinkedIn)</option>
                <option value="Business">Business (Verified + GST + Company Reg + CIN)</option>
              </select>
            </div>

            <div className="vform-grid" style={{ marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="vform-label">PAN Number</label>
                  <a href="https://eportal.incometax.gov.in/iec/foservices/#/pre-login/verifyYourPAN" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>Verify PAN ↗</a>
                </div>
                <input className="vform-input" placeholder="ABCDE1234F" value={founderForm.panNumber}
                  onChange={e => setFounderForm(p => ({ ...p, panNumber: e.target.value }))} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="vform-label">Aadhaar Number</label>
                  <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>Verify Aadhaar ↗</a>
                </div>
                <input className="vform-input" placeholder="XXXX XXXX XXXX" value={founderForm.aadhaarNumber}
                  onChange={e => setFounderForm(p => ({ ...p, aadhaarNumber: e.target.value }))} />
              </div>
              <div>
                <label className="vform-label">LinkedIn Profile URL</label>
                <input className="vform-input" placeholder="https://linkedin.com/in/..." value={founderForm.linkedInUrl}
                  onChange={e => setFounderForm(p => ({ ...p, linkedInUrl: e.target.value }))} />
              </div>
              {(founderForm.verificationLevel === 'Business') && (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="vform-label">GST Number</label>
                      <a href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>Verify GST ↗</a>
                    </div>
                    <input className="vform-input" placeholder="22AAAAA0000A1Z5" value={founderForm.gstNumber}
                      onChange={e => setFounderForm(p => ({ ...p, gstNumber: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="vform-label">Company Registration No.</label>
                      <a href="https://www.mca.gov.in/mcafoportal/viewCompanyOrLLPDetails.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>Verify Co Reg ↗</a>
                    </div>
                    <input className="vform-input" placeholder="U12345MH2020PTC12345" value={founderForm.registrationNumber}
                      onChange={e => setFounderForm(p => ({ ...p, registrationNumber: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="vform-label">CIN Number</label>
                      <a href="https://www.mca.gov.in/mcafoportal/viewCompanyOrLLPDetails.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>Verify CIN ↗</a>
                    </div>
                    <input className="vform-input" placeholder="L12345MH2020PLC12345" value={founderForm.cinNumber}
                      onChange={e => setFounderForm(p => ({ ...p, cinNumber: e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="vform-label">Document Bundle URL (Govt Portal / Drive Link)</label>
              <input className="vform-input" placeholder="https://drive.google.com/..." value={founderForm.documentUrl}
                onChange={e => setFounderForm(p => ({ ...p, documentUrl: e.target.value }))} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="vform-label">Additional Notes</label>
              <textarea className="vform-input" rows={2} placeholder="Any context for the admin reviewer…"
                value={founderForm.notes}
                onChange={e => setFounderForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            {founderStatusVal === 'Rejected' && founderStatus?.data?.notes && (
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--color-rejected)' }}>Rejection Reason:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{founderStatus.data.notes}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : founderStatusVal === 'Pending' ? 'Resubmit Request' : 'Submit Verification Request'}
            </button>
          </form>
        )}
      </SectionCard>

      {/* === STARTUP VERIFICATION === */}
      <SectionCard title="Startup Document Verification" icon="🏢">
        {proposals.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You need to submit a proposal first.</p>
        ) : (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="vform-label">Select Startup / Proposal</label>
              <select className="vform-input" style={{ maxWidth: 420 }}
                value={selectedProposalId} onChange={handleProposalChange}>
                {proposals.map(p => (
                  <option key={p.id ?? p.Id} value={p.id ?? p.Id}>
                    {p.title ?? p.Title ?? `Proposal #${p.id ?? p.Id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Status overview */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Overall Status</span>
              <StatusBadge status={startupStatusVal} />
            </div>

            {startupStatusVal === 'Verified' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-secondary)' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>Startup Verified</div>
              </div>
            ) : (
              <>
                {/* Per-document status grid */}
                {startupStatus?.hasRecord && (
                  <div style={{ marginBottom: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                    {[
                      { label: 'Registration Certificate', key: 'registrationCertificateStatus' },
                      { label: 'GST Document', key: 'gstDocumentStatus' },
                      { label: 'PAN Document', key: 'panDocumentStatus' },
                      { label: 'Financial Statements', key: 'financialStatementsStatus' },
                      { label: 'Pitch Deck', key: 'pitchDeckStatus' },
                    ].map(({ label, key }) => (
                      <div key={key} className="vstat-row">
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <StatusBadge status={startupStatus.data?.[key] || 'Pending'} />
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleStartupSubmit}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    Enter public document links (Google Drive, Govt Portal, etc.) for each required document:
                  </p>
                  <div className="vform-grid" style={{ marginBottom: '1rem' }}>
                    {[
                      { label: 'Registration Certificate URL', field: 'registrationCertificateUrl', placeholder: 'https://...' },
                      { label: 'GST Document URL', field: 'gstDocumentUrl', placeholder: 'https://...' },
                      { label: 'PAN Document URL', field: 'panDocumentUrl', placeholder: 'https://...' },
                      { label: 'Financial Statements URL', field: 'financialStatementsUrl', placeholder: 'https://...' },
                      { label: 'Pitch Deck URL', field: 'pitchDeckUrl', placeholder: 'https://...' },
                    ].map(({ label, field, placeholder }) => (
                      <div key={field}>
                        <label className="vform-label">{label}</label>
                        <input className="vform-input" placeholder={placeholder}
                          value={startupForm[field]}
                          onChange={e => setStartupForm(p => ({ ...p, [field]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label className="vform-label">Notes for Admin</label>
                      <input className="vform-input" placeholder="Any clarifications…"
                        value={startupForm.notes}
                        onChange={e => setStartupForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>

                  {startupStatusVal === 'Rejected' && startupStatus?.data?.notes && (
                    <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--color-rejected)' }}>Rejection Reason:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{startupStatus.data.notes}</span>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={submitting || !selectedProposalId}>
                    {submitting ? 'Submitting…' : startupStatus?.hasRecord ? 'Resubmit Documents' : 'Submit Documents for Review'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </SectionCard>

      {/* === PATENT & IP REGISTRY VERIFICATION === */}
      <SectionCard title="Patent & IP Registry Verification" icon="🛡️">
        {proposals.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You need to submit a proposal first.</p>
        ) : (
          <>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Verification Status</span>
              <StatusBadge status={patentStatusVal} />
            </div>

            {patentStatusVal === 'Verified' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-secondary)' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>Patent Verified</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Patent ID: <strong>{patentForm.patentNumber || 'N/A'}</strong>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePatentSubmit}>
                <div className="vform-grid" style={{ marginBottom: '1rem' }}>
                  <div>
                    <label className="vform-label">Patent Status</label>
                    <select className="vform-input" value={patentForm.patentStatus}
                      onChange={e => setPatentForm(p => ({ ...p, patentStatus: e.target.value }))}>
                      <option value="NoPatent">No Patent / Intellectual Property</option>
                      <option value="PatentDrafted">Patent Drafted (In progress)</option>
                      <option value="PatentFiled">Patent Filed (Submitted to Registry)</option>
                      <option value="PatentPending">Patent Pending (Under examination)</option>
                      <option value="PatentGranted">Patent Granted & Issued</option>
                    </select>
                  </div>

                  {patentForm.patentStatus !== 'NoPatent' && (
                    <>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="vform-label">Patent / Application ID</label>
                          <a 
                            href={patentForm.patentNumber && patentForm.patentNumber.startsWith('20') 
                              ? "https://iprsearch.ipindia.gov.in/publicsearch" 
                              : "https://ppubs.uspto.gov/pubwebapp/"
                            } 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}
                          >
                            Verify Registry ↗
                          </a>
                        </div>
                        <input className="vform-input" placeholder="e.g. US10123456 or 202521044863" value={patentForm.patentNumber}
                          onChange={e => setPatentForm(p => ({ ...p, patentNumber: e.target.value }))} />
                      </div>
                      <div>
                        <label className="vform-label">Filing / Grant Date</label>
                        <input type="date" className="vform-input" value={patentForm.filingDate}
                          onChange={e => setPatentForm(p => ({ ...p, filingDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="vform-label">Patent Document URL (Google Drive / Registry Link)</label>
                        <input className="vform-input" placeholder="https://..." value={patentForm.patentDocumentUrl}
                          onChange={e => setPatentForm(p => ({ ...p, patentDocumentUrl: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary" style={{ margin: 0 }} disabled={submitting}>
                    {submitting ? 'Submitting…' : patentStatus?.hasRecord ? 'Resubmit Patent Details' : 'Submit Patent Details'}
                  </button>

                  {patentForm.patentStatus !== 'NoPatent' && patentForm.patentNumber && (
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ background: 'var(--accent-secondary)', color: 'black', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                      onClick={handleRunPatentCheck} 
                      disabled={runningPatentCheck}
                    >
                      {runningPatentCheck ? '🔍 Querying Registry...' : '⚡ Automated Registry Check'}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Simulated Automated Check Report Card */}
            {patentCheckResult && (
              <div style={{
                marginTop: '1.5rem', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.18)',
                borderRadius: 10, padding: '1.25rem'
              }}>
                <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛡️</span> Automated Registry Scan Findings
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Registry Match</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: 4, color: patentCheckResult.patentRiskLevel === 'High' ? 'var(--color-rejected)' : 'var(--accent-secondary)' }}>
                      {patentCheckResult.patentRiskLevel === 'High' ? '❌ Registry Mismatch' : '✓ Verified ID'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>IP infringement Risk</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: 4, color: patentCheckResult.patentRiskLevel === 'High' ? 'var(--color-rejected)' : patentCheckResult.patentRiskLevel === 'Medium' ? '#f59e0b' : '#10b981' }}>
                      {patentCheckResult.patentRiskLevel}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Clash Similarity</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: 4, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {patentCheckResult.matchPercentage}%
                    </div>
                  </div>
                </div>

                {patentCheckResult.detailsJson && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: 8, fontSize: '0.82rem', lineHeight: '1.4' }}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(patentCheckResult.detailsJson);
                        if (parsed.ErrorMessage) {
                          return <div style={{ color: 'var(--color-rejected)' }}><strong>Error:</strong> {parsed.ErrorMessage}</div>;
                        }
                        return (
                          <>
                            <div style={{ marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                              <strong>Registry Title:</strong> <span style={{ color: 'var(--text-primary)' }}>{parsed.Title}</span>
                            </div>
                            <div style={{ marginBottom: '0.4rem' }}>
                              <strong>Authority:</strong> <span style={{ color: 'var(--text-secondary)' }}>{parsed.Authority}</span> | <strong>Record Type:</strong> <span style={{ color: 'var(--text-secondary)' }}>{parsed.RecordType}</span>
                            </div>
                            <div style={{ marginBottom: '0.4rem' }}>
                              <strong>Inventors:</strong> <span style={{ color: 'var(--text-secondary)' }}>{parsed.Inventors}</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.78rem' }}>
                              "Abstract: {parsed.Abstract}"
                            </div>
                          </>
                        );
                      } catch {
                        return <span style={{ color: 'var(--text-secondary)' }}>Details parse error. Raw data: {patentCheckResult.detailsJson}</span>;
                      }
                    })()}
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                  * Automated check performed against WIPO PatentsView and legal government registers. Recompute score inside the Trust tab to apply risk adjustments.
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
