import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5062/api';

function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Pending:    { bg: '#1e3a5f', color: '#60a5fa', border: '#3b82f6' },
  Achieved:   { bg: '#14532d', color: '#4ade80', border: '#22c55e' },
  Missed:     { bg: '#450a0a', color: '#f87171', border: '#ef4444' },
  Active:     { bg: '#1c3557', color: '#38bdf8', border: '#0ea5e9' },
  Completed:  { bg: '#14532d', color: '#4ade80', border: '#22c55e' },
  Terminated: { bg: '#450a0a', color: '#f87171', border: '#ef4444' },
  FundAllocated: { bg: '#1e3a5f', color: '#a78bfa', border: '#8b5cf6' },
  General:    { bg: '#1c1f2e', color: '#94a3b8', border: '#475569' },
  Monthly:    { bg: '#1a2744', color: '#60a5fa', border: '#3b82f6' },
  Quarterly:  { bg: '#1a2744', color: '#a78bfa', border: '#8b5cf6' },
  Closure:    { bg: '#3b1a1a', color: '#fbbf24', border: '#f59e0b' },
};

function Badge({ label }) {
  const c = STATUS_COLORS[label] || STATUS_COLORS.General;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem',
      fontWeight: 700, letterSpacing: '0.03em',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`
    }}>{label}</span>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: '1rem', fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px', padding: '1.5rem', ...style
    }}>{children}</div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
        padding: '2rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f1f5f9' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Input / textarea helpers ──────────────────────────────────────────────────
const inputStyle = {
  width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: '#f1f5f9', padding: '0.65rem 0.9rem', fontSize: '0.88rem',
  outline: 'none', boxSizing: 'border-box', marginBottom: '0.9rem'
};
const btnPrimary = {
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'var(--text-primary)',
  border: 'none', borderRadius: '10px', padding: '0.65rem 1.4rem',
  fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s'
};
const btnSuccess = { ...btnPrimary, background: 'linear-gradient(135deg,#22c55e,#16a34a)' };
const btnDanger  = { ...btnPrimary, background: 'linear-gradient(135deg,#ef4444,#b91c1c)' };
const btnSecondary = { ...btnPrimary, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };
const labelStyle = { display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProjectLifecycle({ proposalId, proposalTitle, proposalStatus, onBack }) {
  const user = getUser();
  const isAdmin     = user?.role === 'Admin';
  const isFounder = user?.role === 'Founder';
  const isInvestor  = user?.role === 'Investor';

  const [tab, setTab] = useState('milestones');
  const [milestones,  setMilestones]  = useState([]);
  const [updates,     setUpdates]     = useState([]);
  const [dividends,   setDividends]   = useState([]);
  const [status,      setStatus]      = useState(proposalStatus);
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState(null);

  // Modals
  const [showAddMilestone,  setShowAddMilestone]  = useState(false);
  const [showAddUpdate,     setShowAddUpdate]     = useState(false);
  const [showCloseProject,  setShowCloseProject]  = useState(false);
  const [showDividend,      setShowDividend]      = useState(false);
  const [showProof,         setShowProof]         = useState(null); // milestone id

  // Forms
  const [mlForm, setMlForm] = useState({ title: '', description: '', targetDate: '', orderIndex: 0 });
  const [upForm, setUpForm] = useState({ title: '', content: '', updateType: 'General', overallProgress: '', attachmentUrl: '' });
  const [clForm, setClForm] = useState({ outcome: 'Completed', finalReport: '', completionPercentage: '' });
  const [dvForm, setDvForm] = useState({ revenueAmount: '', notes: '' });
  const [proofUrl, setProofUrl] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchMilestones = useCallback(async () => {
    const r = await fetch(`${API}/milestones/proposal/${proposalId}`, { headers: authHeaders() });
    if (r.ok) setMilestones(await r.json());
  }, [proposalId]);

  const fetchUpdates = useCallback(async () => {
    const r = await fetch(`${API}/milestones/updates/proposal/${proposalId}`, { headers: authHeaders() });
    if (r.ok) setUpdates(await r.json());
  }, [proposalId]);

  const fetchDividends = useCallback(async () => {
    const endpoint = isInvestor
      ? `${API}/milestones/dividends/investor/${user.id}`
      : `${API}/milestones/dividends/proposal/${proposalId}`;
    const r = await fetch(endpoint, { headers: authHeaders() });
    if (r.ok) setDividends(await r.json());
  }, [proposalId, isInvestor, user?.id]);

  useEffect(() => {
    fetchMilestones();
    fetchUpdates();
    fetchDividends();
  }, [fetchMilestones, fetchUpdates, fetchDividends]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function addMilestone() {
    setLoading(true);
    const r = await fetch(`${API}/milestones`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ proposalId, ...mlForm, orderIndex: Number(mlForm.orderIndex), targetDate: mlForm.targetDate })
    });
    setLoading(false);
    if (r.ok) { fetchMilestones(); setShowAddMilestone(false); setMlForm({ title: '', description: '', targetDate: '', orderIndex: 0 }); showToast('Milestone added!'); }
    else showToast((await r.json()).message || 'Error', 'error');
  }

  async function markAchieved(id) {
    setLoading(true);
    const r = await fetch(`${API}/milestones/${id}/achieve`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ proofDocumentUrl: proofUrl })
    });
    setLoading(false);
    setShowProof(null); setProofUrl('');
    if (r.ok) { fetchMilestones(); showToast('Milestone marked as Achieved ✅'); }
    else showToast((await r.json()).message || 'Error', 'error');
  }

  async function markMissed(id) {
    if (!window.confirm('Mark this milestone as Missed?')) return;
    const r = await fetch(`${API}/milestones/${id}/miss`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ adminNotes: 'Marked missed by admin.' })
    });
    if (r.ok) { fetchMilestones(); showToast('Milestone marked as Missed ⚠️', 'warn'); }
  }

  async function postUpdate() {
    setLoading(true);
    const r = await fetch(`${API}/milestones/updates`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ proposalId, ...upForm, overallProgress: upForm.overallProgress ? Number(upForm.overallProgress) : null })
    });
    setLoading(false);
    if (r.ok) { fetchUpdates(); setShowAddUpdate(false); setUpForm({ title: '', content: '', updateType: 'General', overallProgress: '', attachmentUrl: '' }); showToast('Progress update posted!'); }
    else showToast((await r.json()).message || 'Error', 'error');
  }

  async function activateProject() {
    if (!window.confirm('Activate this project? (FundAllocated → Active)')) return;
    const r = await fetch(`${API}/milestones/activate/${proposalId}`, { method: 'POST', headers: authHeaders() });
    if (r.ok) { setStatus('Active'); showToast('Project Activated 🚀'); }
    else showToast((await r.json()).message || 'Error', 'error');
  }

  async function closeProject() {
    setLoading(true);
    const r = await fetch(`${API}/milestones/close/${proposalId}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ...clForm, completionPercentage: clForm.completionPercentage ? Number(clForm.completionPercentage) : null })
    });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      setStatus(data.status);
      setShowCloseProject(false);
      showToast(`Project ${data.status}!`, data.status === 'Completed' ? 'success' : 'warn');
    } else showToast((await r.json()).message || 'Error', 'error');
  }

  async function distributeDividends() {
    setLoading(true);
    const r = await fetch(`${API}/milestones/dividends/distribute`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ proposalId, revenueAmount: Number(dvForm.revenueAmount), notes: dvForm.notes })
    });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      fetchDividends();
      setShowDividend(false);
      setDvForm({ revenueAmount: '', notes: '' });
      showToast(`Distributed to ${data.payouts?.length || 0} investor(s) 💹`);
    } else showToast((await r.json()).message || 'Error', 'error');
  }

  // ── Tab buttons ───────────────────────────────────────────────────────────
  const tabs = [
    { id: 'milestones', label: '🏁 Milestones' },
    { id: 'updates',    label: '📊 Progress Updates' },
    { id: 'equity',     label: '💹 Equity Returns' },
    { id: 'closure',    label: '🏆 Project Closure' },
  ];

  const achievedCount = milestones.filter(m => m.status === 'Achieved').length;
  const totalCount    = milestones.length;
  const progressPct   = totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', fontFamily: 'var(--font-sans, Inter, sans-serif)', color: '#f1f5f9', minHeight: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9998,
          background: toast.type === 'error' ? '#450a0a' : toast.type === 'warn' ? '#422006' : '#14532d',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : toast.type === 'warn' ? '#f59e0b' : '#22c55e'}`,
          borderRadius: '12px', padding: '0.9rem 1.4rem', fontSize: '0.88rem', color: '#f1f5f9',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)', maxWidth: '320px'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {proposalTitle}
          </h2>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
            <Badge label={status} />
            {totalCount > 0 && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{achievedCount}/{totalCount} milestones achieved</span>}
          </div>
        </div>
        {/* Admin action buttons */}
        {isAdmin && status === 'FundAllocated' && (
          <button onClick={activateProject} style={{ ...btnSuccess, fontSize: '0.82rem' }}>🚀 Activate Project</button>
        )}
        {isAdmin && (status === 'Active' || status === 'FundAllocated') && (
          <button onClick={() => setShowCloseProject(true)} style={{ ...btnDanger, fontSize: '0.82rem' }}>🔒 Close Project</button>
        )}
        {isAdmin && (status === 'Active' || status === 'Completed') && (
          <button onClick={() => setShowDividend(true)} style={{ ...btnPrimary, fontSize: '0.82rem' }}>💹 Distribute Dividends</button>
        )}
      </div>

      {/* Progress summary */}
      {totalCount > 0 && (
        <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <ProgressRing pct={progressPct} size={90} stroke={9} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.3rem' }}>
              Overall Milestone Progress
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Achieved', count: milestones.filter(m => m.status === 'Achieved').length, color: '#22c55e' },
                { label: 'Pending',  count: milestones.filter(m => m.status === 'Pending').length,  color: '#60a5fa' },
                { label: 'Missed',   count: milestones.filter(m => m.status === 'Missed').length,   color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Dividends Paid</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>
              ${dividends.reduce((a, d) => a + (d.payoutAmount || 0), 0).toLocaleString()}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.55rem 1.1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontSize: '0.83rem', fontWeight: 600, transition: 'all 0.2s',
            background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
            color: tab === t.id ? '#fff' : '#94a3b8'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab: Milestones ── */}
      {tab === 'milestones' && (
        <div>
          {/* TODO (CDAC-32): Refactor this basic stack into a modern Vertical Stepper Timeline UI */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>🏁 Project Milestones</h3>
            {(isAdmin || isFounder) && (status === 'Active' || status === 'FundAllocated') && (
              <button onClick={() => setShowAddMilestone(true)} style={{ ...btnPrimary, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Add Milestone</button>
            )}
          </div>
          {milestones.length === 0 ? (
            <Card><p style={{ color: '#64748b', textAlign: 'center', margin: 0 }}>No milestones yet. Add the first milestone to begin tracking project progress.</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {milestones.map((m, idx) => (
                <Card key={m.id} style={{ borderLeft: `4px solid ${STATUS_COLORS[m.status]?.border || '#475569'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{m.title}</span>
                        <Badge label={m.status} />
                      </div>
                      {m.description && <p style={{ margin: '0 0 0.5rem', color: '#94a3b8', fontSize: '0.83rem' }}>{m.description}</p>}
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                        <span>🎯 Target: {new Date(m.targetDate).toLocaleDateString()}</span>
                        {m.achievedAt && <span>✅ Achieved: {new Date(m.achievedAt).toLocaleDateString()}</span>}
                        {m.adminNotes && <span style={{ color: '#fbbf24' }}>⚠️ {m.adminNotes}</span>}
                      </div>
                      {m.proofDocumentUrl && (
                        <a href={m.proofDocumentUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', fontSize: '0.78rem', color: '#818cf8' }}>
                          📎 View Proof Document
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {m.status === 'Pending' && (isAdmin || isFounder) && (
                        <button onClick={() => setShowProof(m.id)} style={{ ...btnSuccess, padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>✅ Mark Achieved</button>
                      )}
                      {m.status === 'Pending' && isAdmin && (
                        <button onClick={() => markMissed(m.id)} style={{ ...btnDanger, padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}>⚠️ Mark Missed</button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Progress Updates ── */}
      {tab === 'updates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>📊 Progress Updates</h3>
            {(isAdmin || isFounder) && status !== 'Terminated' && (
              <button onClick={() => setShowAddUpdate(true)} style={{ ...btnPrimary, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Post Update</button>
            )}
          </div>
          {updates.length === 0 ? (
            <Card><p style={{ color: '#64748b', textAlign: 'center', margin: 0 }}>No updates posted yet. Post updates to keep investors informed.</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {updates.map(u => (
                <Card key={u.id} style={{ borderLeft: `4px solid ${STATUS_COLORS[u.updateType]?.border || '#475569'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <Badge label={u.updateType || 'General'} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{u.title}</span>
                      </div>
                      <p style={{ margin: '0 0 0.75rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{u.content}</p>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                        <span>👤 {u.author?.fullName || 'Admin'}</span>
                        <span>📅 {new Date(u.createdAt).toLocaleDateString()}</span>
                        {u.overallProgress != null && (
                          <span style={{ color: '#4ade80', fontWeight: 700 }}>📈 {u.overallProgress}% complete</span>
                        )}
                      </div>
                      {u.attachmentUrl && (
                        <a href={u.attachmentUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', fontSize: '0.78rem', color: '#818cf8' }}>
                          📎 View Attachment
                        </a>
                      )}
                    </div>
                    {u.overallProgress != null && (
                      <ProgressRing pct={Math.round(u.overallProgress)} size={64} stroke={7} />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Equity Returns ── */}
      {tab === 'equity' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>💹 Equity Returns & Dividends</h3>
          </div>
          {dividends.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💹</div>
                <p style={{ color: '#64748b', margin: 0 }}>No dividend payouts yet. Admin distributes dividends when the startup generates revenue.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Received', value: `$${dividends.reduce((a,d) => a + (d.payoutAmount||0), 0).toLocaleString()}`, color: '#4ade80' },
                  { label: 'Payouts Count',  value: dividends.length, color: '#60a5fa' },
                  { label: 'Avg per Payout', value: `$${dividends.length ? Math.round(dividends.reduce((a,d) => a + (d.payoutAmount||0), 0) / dividends.length).toLocaleString() : 0}`, color: '#a78bfa' },
                ].map(s => (
                  <Card key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.2rem' }}>{s.label}</div>
                  </Card>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dividends.map(d => (
                  <Card key={d.id} style={{ borderLeft: '4px solid #22c55e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '1.2rem', marginBottom: '0.3rem' }}>
                          +${(d.payoutAmount || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                          {d.proposalTitle && <span>📁 {d.proposalTitle}</span>}
                          {d.investor && <span>👤 {d.investor.fullName}</span>}
                          <span>🏦 Equity: {(d.equityPercentage || 0).toFixed(2)}%</span>
                          <span>💵 Revenue Base: ${(d.revenueBase || 0).toLocaleString()}</span>
                          <span>📅 {new Date(d.payoutDate).toLocaleDateString()}</span>
                        </div>
                        {d.notes && <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>{d.notes}</p>}
                      </div>
                      <Badge label={d.status || 'Processed'} />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Closure ── */}
      {tab === 'closure' && (
        <div>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#e2e8f0' }}>🏆 Project Lifecycle & Closure</h3>

          {/* Lifecycle timeline */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', minWidth: '600px' }}>
                {[
                  { s: 'Submitted',    icon: '📝' },
                  { s: 'Approved',     icon: '✅' },
                  { s: 'FundAllocated',icon: '💰' },
                  { s: 'Active',       icon: '🚀' },
                  { s: 'Completed',    icon: '🏆' },
                ].map((step, i, arr) => {
                  const statuses = ['Submitted','UnderReview','Reviewed','Approved','FundAllocated','Active','Completed'];
                  const currentIdx = statuses.indexOf(status);
                  const stepIdx    = statuses.indexOf(step.s);
                  const done    = currentIdx >= stepIdx;
                  const current = statuses[currentIdx] === step.s;
                  return (
                    <div key={step.s} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem',
                          background: current ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : done ? '#14532d' : '#1e293b',
                          border: `2px solid ${current ? '#818cf8' : done ? '#22c55e' : '#334155'}`,
                          boxShadow: current ? '0 0 16px rgba(99,102,241,0.5)' : 'none'
                        }}>{step.icon}</div>
                        <span style={{ fontSize: '0.65rem', color: current ? '#818cf8' : done ? '#4ade80' : '#475569', fontWeight: 600, textAlign: 'center' }}>
                          {step.s}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ flex: 1, height: '2px', background: done && currentIdx > stepIdx ? '#22c55e' : '#1e293b', margin: '0 4px', marginBottom: '20px' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Closure report updates */}
          {updates.filter(u => u.updateType === 'Closure').length > 0 && (
            <div>
              <h4 style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '1rem' }}>📋 Closure Reports</h4>
              {updates.filter(u => u.updateType === 'Closure').map(u => (
                <Card key={u.id} style={{ borderLeft: '4px solid #f59e0b', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>{u.title}</div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.5rem' }}>{u.content}</p>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📅 {new Date(u.createdAt).toLocaleDateString()}</div>
                </Card>
              ))}
            </div>
          )}

          {(status === 'Completed' || status === 'Terminated') && (
            <Card style={{ borderLeft: `4px solid ${status === 'Completed' ? '#22c55e' : '#ef4444'}` }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{status === 'Completed' ? '🏆' : '❌'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: status === 'Completed' ? '#4ade80' : '#f87171' }}>
                Project {status}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                {status === 'Completed'
                  ? 'This project has been successfully completed. All deliverables were met and funds have been fully accounted for.'
                  : 'This project was terminated. Unused funds have been returned to the capital pool.'}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ═══ MODALS ════════════════════════════════════════════════════════════ */}

      {/* Add Milestone */}
      <Modal open={showAddMilestone} onClose={() => setShowAddMilestone(false)} title="Add Milestone">
        <label style={labelStyle}>Milestone Title *</label>
        <input style={inputStyle} value={mlForm.title} onChange={e => setMlForm(f => ({...f, title: e.target.value}))} placeholder="e.g. MVP Launch" />
        <label style={labelStyle}>Description</label>
        <textarea style={{...inputStyle, resize: 'vertical', minHeight: '80px'}} value={mlForm.description} onChange={e => setMlForm(f => ({...f, description: e.target.value}))} placeholder="What needs to be delivered?" />
        <label style={labelStyle}>Target Date *</label>
        <input type="date" style={inputStyle} value={mlForm.targetDate} onChange={e => setMlForm(f => ({...f, targetDate: e.target.value}))} />
        <label style={labelStyle}>Order / Phase #</label>
        <input type="number" style={inputStyle} value={mlForm.orderIndex} onChange={e => setMlForm(f => ({...f, orderIndex: e.target.value}))} min="0" />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAddMilestone(false)} style={btnSecondary}>Cancel</button>
          <button onClick={addMilestone} disabled={loading || !mlForm.title || !mlForm.targetDate} style={btnPrimary}>
            {loading ? 'Adding…' : 'Add Milestone'}
          </button>
        </div>
      </Modal>

      {/* Proof of milestone */}
      <Modal open={showProof !== null} onClose={() => setShowProof(null)} title="Mark Milestone as Achieved">
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 0 }}>Optionally attach a proof document URL (GitHub link, report, demo video, etc.)</p>
        <label style={labelStyle}>Proof Document URL (optional)</label>
        <input style={inputStyle} value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://..." />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowProof(null)} style={btnSecondary}>Cancel</button>
          <button onClick={() => markAchieved(showProof)} disabled={loading} style={btnSuccess}>✅ Confirm Achieved</button>
        </div>
      </Modal>

      {/* Post Progress Update */}
      <Modal open={showAddUpdate} onClose={() => setShowAddUpdate(false)} title="Post Progress Update">
        <label style={labelStyle}>Update Title *</label>
        <input style={inputStyle} value={upForm.title} onChange={e => setUpForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Q2 Update" />
        <label style={labelStyle}>Update Type</label>
        <select style={inputStyle} value={upForm.updateType} onChange={e => setUpForm(f => ({...f, updateType: e.target.value}))}>
          {['General', 'Monthly', 'Quarterly', 'Milestone'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={labelStyle}>Overall Progress % (0-100)</label>
        <input type="number" style={inputStyle} value={upForm.overallProgress} onChange={e => setUpForm(f => ({...f, overallProgress: e.target.value}))} min="0" max="100" placeholder="e.g. 65" />
        <label style={labelStyle}>Content *</label>
        <textarea style={{...inputStyle, resize: 'vertical', minHeight: '120px'}} value={upForm.content} onChange={e => setUpForm(f => ({...f, content: e.target.value}))} placeholder="Describe what has been accomplished, blockers, next steps..." />
        <label style={labelStyle}>Attachment URL</label>
        <input style={inputStyle} value={upForm.attachmentUrl} onChange={e => setUpForm(f => ({...f, attachmentUrl: e.target.value}))} placeholder="https://..." />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAddUpdate(false)} style={btnSecondary}>Cancel</button>
          <button onClick={postUpdate} disabled={loading || !upForm.title || !upForm.content} style={btnPrimary}>
            {loading ? 'Posting…' : 'Post Update'}
          </button>
        </div>
      </Modal>

      {/* Close Project */}
      <Modal open={showCloseProject} onClose={() => setShowCloseProject(false)} title="Close Project">
        <label style={labelStyle}>Outcome *</label>
        <select style={inputStyle} value={clForm.outcome} onChange={e => setClForm(f => ({...f, outcome: e.target.value}))}>
          <option value="Completed">✅ Completed — Successfully delivered</option>
          <option value="Terminated">❌ Terminated — Failed / Cancelled</option>
        </select>
        {clForm.outcome === 'Terminated' && (
          <>
            <label style={labelStyle}>Completion % at Termination</label>
            <input type="number" style={inputStyle} value={clForm.completionPercentage} onChange={e => setClForm(f => ({...f, completionPercentage: e.target.value}))} min="0" max="100" placeholder="e.g. 40" />
          </>
        )}
        <label style={labelStyle}>Final Report *</label>
        <textarea style={{...inputStyle, resize: 'vertical', minHeight: '140px'}} value={clForm.finalReport} onChange={e => setClForm(f => ({...f, finalReport: e.target.value}))} placeholder="Write a final summary of the project outcomes, fund usage, and lessons learned..." />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCloseProject(false)} style={btnSecondary}>Cancel</button>
          <button onClick={closeProject} disabled={loading || !clForm.finalReport} style={clForm.outcome === 'Completed' ? btnSuccess : btnDanger}>
            {loading ? 'Closing…' : clForm.outcome === 'Completed' ? '🏆 Complete Project' : '❌ Terminate Project'}
          </button>
        </div>
      </Modal>

      {/* Distribute Dividends */}
      <Modal open={showDividend} onClose={() => setShowDividend(false)} title="Distribute Equity Dividends">
        <p style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: 0, lineHeight: 1.6 }}>
          Enter the revenue generated by the startup. Dividends will be automatically calculated proportionally based on each investor's equity stake.
        </p>
        <label style={labelStyle}>Revenue Amount ($) *</label>
        <input type="number" style={inputStyle} value={dvForm.revenueAmount} onChange={e => setDvForm(f => ({...f, revenueAmount: e.target.value}))} placeholder="e.g. 500000" min="0" />
        <label style={labelStyle}>Notes (optional)</label>
        <textarea style={{...inputStyle, resize: 'vertical', minHeight: '80px'}} value={dvForm.notes} onChange={e => setDvForm(f => ({...f, notes: e.target.value}))} placeholder="e.g. Q3 2026 revenue dividend" />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowDividend(false)} style={btnSecondary}>Cancel</button>
          <button onClick={distributeDividends} disabled={loading || !dvForm.revenueAmount} style={btnPrimary}>
            {loading ? 'Distributing…' : '💹 Distribute Dividends'}
          </button>
        </div>
      </Modal>

    </div>
  );
}
