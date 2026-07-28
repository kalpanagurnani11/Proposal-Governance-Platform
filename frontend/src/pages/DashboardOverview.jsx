import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────── */
function cn(...classes) { return classes.filter(Boolean).join(' '); }

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(null);
  useEffect(() => {
    start.current = null;
    const target = Number(value) || 0;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display}</>;
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    Draft:        'badge-draft',
    Submitted:    'badge-submitted',
    UnderReview:  'badge-underreview',
    Reviewed:     'badge-reviewed',
    Approved:     'badge-approved',
    Rejected:     'badge-rejected',
    FundAllocated:'badge-fundallocated',
  };
  const cls = map[status] || 'badge-draft';
  const labels = {
    UnderReview: 'Under Review',
    FundAllocated: 'Fund Allocated',
  };
  return <span className={`badge ${cls}`}>{labels[status] || status}</span>;
}

/* ─── SVG Bar Chart ──────────────────────────────────────── */
function BarChart({ data, height = 160 }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = 28;
  const gap  = 16;
  const totalW = data.length * (barW + gap) - gap;
  const paddingBottom = 28;
  const chartH = height - paddingBottom;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      className="svg-chart"
      style={{ height }}
      aria-label="Proposal trends bar chart"
      role="img"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
        <line
          key={i}
          x1={0} y1={chartH * (1 - r)}
          x2={totalW} y2={chartH * (1 - r)}
          stroke="var(--border-color)"
          strokeDasharray={r === 0 ? 'none' : '4 3'}
          strokeWidth="1"
        />
      ))}

      {data.map((d, i) => {
        const x = i * (barW + gap);
        const barH = (d.value / maxVal) * chartH * 0.9;
        const y = chartH - barH;
        const colors = {
          approved:  'var(--color-approved)',
          rejected:  'var(--color-rejected)',
          pending:   'var(--color-underreview)',
          submitted: 'var(--color-submitted)',
          default:   'var(--accent-primary)',
        };
        const fill = colors[d.type] || colors.default;
        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={fill}
              opacity="0.85"
              className="chart-bar"
              style={{ transition: 'height 0.6s ease, y 0.6s ease' }}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {/* Value label */}
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-muted)"
              fontFamily="var(--font-mono)"
            >
              {d.value}
            </text>
            {/* X label */}
            <text
              x={x + barW / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-muted)"
              fontFamily="var(--font-sans)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Donut Chart ─────────────────────────────────────── */
function DonutChart({ segments, size = 130 }) {
  const r = 45;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, sg) => s + sg.value, 0) || 1;

  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Approval rate donut chart" role="img">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color)" strokeWidth="14" />

      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const offset = -(cumulative * circumference);
        cumulative += pct;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity="0.9"
          >
            <title>{`${seg.label}: ${seg.value} (${Math.round(pct * 100)}%)`}</title>
          </circle>
        );
      })}

      {/* Center text */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-sans)">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-sans)">
        TOTAL
      </text>
    </svg>
  );
}

/* ─── Workflow Timeline ───────────────────────────────────── */
function WorkflowTimeline({ status }) {
  const steps = [
    { key: 'submitted',   label: 'Submitted',    icon: '1' },
    { key: 'underreview', label: 'Under Review',  icon: '2' },
    { key: 'reviewed',    label: 'Reviewed',      icon: '3' },
    { key: 'approved',    label: 'Approved',      icon: '✓' },
  ];

  const order = ['submitted', 'underreview', 'reviewed', 'approved', 'rejected'];
  const currentIdx = order.indexOf((status || '').toLowerCase());
  const isRejected = (status || '').toLowerCase() === 'rejected';

  const getState = (stepKey, stepIdx) => {
    if (isRejected && stepIdx === steps.length - 1) return 'rejected';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="workflow-timeline" role="list" aria-label="Proposal workflow timeline">
      {steps.map((step, i) => {
        const state = getState(step.key, i);
        return (
          <div key={step.key} className={`workflow-step ${state}`} role="listitem">
            <div className="workflow-dot" aria-label={`${step.label}: ${state}`}>
              {state === 'completed' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.icon
              )}
            </div>
            <div className="workflow-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Mini Horizontal Bar ────────────────────────────────── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${pct}%`, background: color, transition: 'width 1s ease' }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  );
}

/* ─── KPI Card ───────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, trend, trendLabel }) {
  return (
    <div className={`metric-card ${color}`} role="region" aria-label={label}>
      <div>
        <div className={`metric-icon ${color}`} aria-hidden="true">{icon}</div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">
          <AnimatedNumber value={value} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`metric-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
          <span>{Math.abs(trend)}% {trendLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────── */
export default function DashboardOverview({ user, setCurrentTab }) {
  const [proposals, setProposals]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Founder-specific compliance state
  const [founderVerification, setFounderVerification] = useState(null);
  const [activeSub, setActiveSub]                     = useState(null);
  const [trustDetails, setTrustDetails]               = useState(null);
  const [latestReviews, setLatestReviews]             = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [propsRes, statsRes] = await Promise.allSettled([
          api.get('/proposals'),
          api.get('/analytics/summary').catch(() => null),
        ]);

        let list = [];
        if (propsRes.status === 'fulfilled') {
          const d = propsRes.value;
          list = Array.isArray(d) ? d : (d?.proposals ?? d?.items ?? []);
        }
        setProposals(list);

        if (statsRes.status === 'fulfilled' && statsRes.value) {
          setStats(statsRes.value);
        }

        // Founder-only compliance data
        if (user?.role === 'Founder') {
          const [verRes, subRes] = await Promise.allSettled([
            api.get('/verification/founder/status'),
            api.get('/subscription/my'),
          ]);
          if (verRes.status === 'fulfilled') setFounderVerification(verRes.value);
          if (subRes.status === 'fulfilled') setActiveSub(subRes.value);

          // Load trust + reviews for first non-draft proposal
          if (list.length > 0) {
            const firstProposal = list.find(p => (p.status || p.Status) !== 'Draft') || list[0];
            const pid = firstProposal.id || firstProposal.Id;
            const [trustRes, reviewsRes] = await Promise.allSettled([
              api.get(`/trust/${pid}`).catch(() => null),
              api.get(`/reviews/proposal/${pid}`).catch(() => []),
            ]);
            if (trustRes.status === 'fulfilled' && trustRes.value) setTrustDetails(trustRes.value);
            if (reviewsRes.status === 'fulfilled') {
              const revArr = Array.isArray(reviewsRes.value) ? reviewsRes.value : [];
              setLatestReviews(revArr.slice(0, 3));
            }
          }
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.role]);

  /* Compute KPIs from proposals list */
  const total     = proposals.length;
  const approved  = proposals.filter(p => (p.status || p.Status) === 'Approved').length;
  const rejected  = proposals.filter(p => (p.status || p.Status) === 'Rejected').length;
  const pending   = proposals.filter(p =>
    ['Submitted', 'UnderReview', 'Reviewed'].includes(p.status || p.Status)
  ).length;
  const draft     = proposals.filter(p => (p.status || p.Status) === 'Draft').length;
  const compliance = total > 0 ? Math.round((approved / total) * 100) : 0;

  /* Status distribution for donut chart */
  const donutSegments = [
    { label: 'Approved', value: approved, color: 'var(--color-approved)' },
    { label: 'Pending',  value: pending,  color: 'var(--color-underreview)' },
    { label: 'Rejected', value: rejected, color: 'var(--color-rejected)' },
    { label: 'Draft',    value: draft,    color: 'var(--color-draft)' },
  ].filter(s => s.value > 0);

  /* Monthly trend bar data (last 6 months from proposals) */
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = months[d.getMonth()];
    const count = proposals.filter(p => {
      const date = new Date(p.createdAt || p.CreatedAt || p.submittedAt || Date.now());
      return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
    }).length;
    return { label, value: count, type: 'default' };
  });

  /* Department breakdown */
  const deptMap = {};
  proposals.forEach(p => {
    const dept = p.department || p.Department || 'General';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptEntries = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxDept = deptEntries[0]?.[1] || 1;

  /* Filtered table */
  const filtered = proposals.filter(p => {
    const title  = p.title || p.Title || '';
    const status = p.status || p.Status || '';
    const matchQ = !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchS = statusFilter === 'All' || status === statusFilter;
    return matchQ && matchS;
  }).slice(0, 8);

  const deptColors = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444'];

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h2>Dashboard Overview</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading platform analytics…</p>
          </div>
        </div>
        <div className="metrics-grid">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="metric-card" style={{ minHeight: 120 }}>
              <div className="skeleton" style={{ height: 36, width: 36, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: '0.5rem', borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 28, width: '40%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Welcome back, <strong>{user.fullName?.split(' ')[0] || user.username}</strong>. Here's your platform summary.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentTab('marketplace')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
            </svg>
            Marketplace
          </button>
          {(user.role === 'Founder') && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentTab('new-proposal')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Proposal
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="metrics-grid">
        <KpiCard
          label="Total Proposals"
          value={total}
          color="blue"
          trend={8}
          trendLabel="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
        />
        <KpiCard
          label="Approved"
          value={approved}
          color="green"
          trend={12}
          trendLabel="approval rate"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        />
        <KpiCard
          label="Pending Review"
          value={pending}
          color="amber"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <KpiCard
          label="Rejected"
          value={rejected}
          color="red"
          trend={-3}
          trendLabel="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          }
        />
        <KpiCard
          label="Compliance Score"
          value={compliance}
          color="purple"
          trendLabel="% approved"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          }
        />
      </div>

      {/* ── Founder Compliance & Account Status ── */}
      {user?.role === 'Founder' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Compliance &amp; Account Status</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

            {/* ── Trust Score Widget ── */}
            <div className="section-card" style={{ marginBottom: 0, background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(99,102,241,0.04))' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1rem' }}>🏆</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Trust Score</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setCurrentTab('trust')}>View Details →</button>
              </div>
              {trustDetails ? (
                <div className="card-body" style={{ padding: '0.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
                        <circle cx="45" cy="45" r="36" fill="none"
                          stroke={trustDetails.trustScore >= 75 ? '#10b981' : trustDetails.trustScore >= 50 ? '#06b6d4' : trustDetails.trustScore >= 30 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="9" strokeLinecap="round"
                          strokeDasharray={`${((trustDetails.trustScore || 0) / 100) * 226} 226`}
                          transform="rotate(-90 45 45)"
                          style={{ transition: 'stroke-dasharray 0.8s ease' }}
                        />
                        <text x="45" y="49" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="800" fontFamily="monospace">{trustDetails.trustScore || 0}</text>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: trustDetails.trustScore >= 75 ? '#10b981' : trustDetails.trustScore >= 50 ? '#06b6d4' : trustDetails.trustScore >= 30 ? '#f59e0b' : '#ef4444', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {trustDetails.trustLevel || (trustDetails.trustScore >= 75 ? 'Excellent' : trustDetails.trustScore >= 50 ? 'Good' : trustDetails.trustScore >= 30 ? 'Moderate' : 'High Risk')}
                      </div>
                      {[
                        { label: 'Founder Verified', ok: trustDetails.founderVerified },
                        { label: 'Docs Verified', ok: trustDetails.startupVerified },
                        { label: 'Patent Verified', ok: trustDetails.patentVerified },
                        { label: 'Due Diligence Done', ok: trustDetails.reviewerApproved },
                      ].map(({ label, ok }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.22rem' }}>
                          <span style={{ color: ok ? '#10b981' : '#ef444460', fontSize: '0.72rem', fontWeight: 700 }}>{ok ? '✓' : '✗'}</span>
                          <span style={{ fontSize: '0.76rem', color: ok ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>📊</div>
                  No trust score yet — submit a proposal to start.
                  <br/>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem', fontSize: '0.78rem' }} onClick={() => setCurrentTab('trust')}>Generate Score</button>
                </div>
              )}
            </div>

            {/* ── Verification Status Widget ── */}
            <div className="section-card" style={{ marginBottom: 0, background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,182,212,0.03))' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1rem' }}>🛡️</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Verification Hub</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setCurrentTab('verification')}>Go to Hub →</button>
              </div>
              <div className="card-body" style={{ padding: '0.25rem 0' }}>
                {(() => {
                  const fStatus = founderVerification?.status || founderVerification?.data?.status || 'Unverified';
                  const checks = [
                    { label: 'Founder Identity', status: fStatus, hint: 'PAN, Aadhaar, LinkedIn' },
                    { label: 'Startup Documents', status: trustDetails?.startupVerified ? 'Verified' : 'Unverified', hint: 'Registration, GST, PAN docs' },
                    { label: 'Patent / IP Info', status: trustDetails?.patentVerified ? 'Verified' : (trustDetails?.patentStatus === 'NoPatent' ? 'Unverified' : 'Pending'), hint: 'Patent status confirmed' },
                  ];
                  const statusColor = { Verified: '#10b981', Pending: '#f59e0b', Rejected: '#ef4444', Unverified: '#64748b' };
                  const statusIcon  = { Verified: '✓', Pending: '⏳', Rejected: '✗', Unverified: '—' };
                  return checks.map(({ label, status, hint }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.73rem', color: statusColor[status] || '#64748b', background: `${statusColor[status] || '#64748b'}18`, border: `1px solid ${statusColor[status] || '#64748b'}40`, borderRadius: 20, padding: '0.18rem 0.6rem', whiteSpace: 'nowrap' }}>
                        {statusIcon[status] || '—'} {status}
                      </span>
                    </div>
                  ));
                })()}
                {founderVerification?.status === 'Pending' && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.75rem', color: '#f59e0b' }}>
                    ⏳ Your verification request is under admin review.
                  </div>
                )}
                {(!founderVerification || (!founderVerification.hasRecord && founderVerification?.status !== 'Pending' && founderVerification?.status !== 'Verified')) && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.78rem' }} onClick={() => setCurrentTab('verification')}>
                    Submit Verification Documents
                  </button>
                )}
              </div>
            </div>

            {/* ── Subscription Plan Widget ── */}
            <div className="section-card" style={{ marginBottom: 0, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1rem' }}>💳</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Subscription Plan</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setCurrentTab('subscription')}>Manage →</button>
              </div>
              <div className="card-body" style={{ padding: '0.25rem 0' }}>
                {activeSub?.hasActive && activeSub?.data ? (() => {
                  const sub = activeSub.data;
                  const planName = sub.subscription?.name || sub.Subscription?.Name || 'Premium Plan';
                  const planPrice = sub.subscription?.price ?? sub.Subscription?.Price ?? 0;
                  const endDate = sub.endDate || sub.EndDate;
                  const isPremium = planPrice > 0;
                  const remainConsult = sub.remainingReviewerConsultations ?? sub.RemainingReviewerConsultations ?? 5;
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: isPremium ? '#a78bfa' : 'var(--text-primary)' }}>{planName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{isPremium ? `₹${planPrice}/month` : 'Free Tier'}</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '0.2rem 0.6rem' }}>✓ Active</span>
                      </div>
                      {endDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.7rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Renews:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                      {isPremium && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {[
                            ['🤖 AI Assistant', 'Included'],
                            ['📞 Expert Consult', `${remainConsult} left`],
                            ['⭐ Featured Listing', 'Eligible'],
                          ].map(([feat, note]) => (
                            <div key={feat} style={{ fontSize: '0.7rem', padding: '0.22rem 0.55rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, color: 'rgba(165,180,252,0.9)' }}>
                              {feat} <span style={{ color: '#10b981', fontWeight: 600 }}>{note}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🆓</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Free Tier</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>Upgrade for AI analysis, expert consultations &amp; featured listings.</p>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem', width: '100%' }} onClick={() => setCurrentTab('subscription')}>Upgrade to Premium</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Reviewer Advice / Feedback ── */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>💬</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Reviewer Feedback &amp; Advice</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Expert evaluations on your latest proposal</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setCurrentTab('dashboard')}>All Proposals →</button>
            </div>
            {latestReviews.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {latestReviews.map((rev, idx) => {
                  const avgScore = Math.round(((rev.feasibilityScore || 0) + (rev.strategicScore || 0) + (rev.riskScore || 0) + (rev.roiScore || 0)) / 4);
                  const scoreColor = avgScore >= 7 ? '#10b981' : avgScore >= 5 ? '#f59e0b' : '#ef4444';
                  const scores = [
                    { label: 'Feasibility', val: rev.feasibilityScore },
                    { label: 'Strategy',    val: rev.strategicScore },
                    { label: 'Risk',        val: rev.riskScore },
                    { label: 'ROI',         val: rev.roiScore },
                  ];
                  return (
                    <div key={rev.id || idx} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
                      {/* Top accent bar */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${scoreColor}, transparent)`, borderRadius: '12px 12px 0 0' }} />
                      {/* Reviewer Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${scoreColor}30, ${scoreColor}10)`, border: `1px solid ${scoreColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', color: scoreColor, flexShrink: 0 }}>
                            {rev.reviewer?.fullName?.[0]?.toUpperCase() || rev.reviewer?.username?.[0]?.toUpperCase() || 'R'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{rev.reviewer?.fullName || rev.reviewer?.username || 'Reviewer'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: scoreColor, fontFamily: 'monospace', lineHeight: 1 }}>
                            {avgScore}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Score</div>
                        </div>
                      </div>
                      {/* Score breakdown pills */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {scores.filter(s => s.val != null).map(({ label, val }) => (
                          <span key={label} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            {label}: <strong style={{ color: 'var(--text-primary)' }}>{val}/10</strong>
                          </span>
                        ))}
                      </div>
                      {/* Reviewer Comment */}
                      {rev.comment && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>📝 Reviewer Notes</div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{rev.comment}"</p>
                        </div>
                      )}
                      {/* Recommendation */}
                      {rev.recommendation && (
                        <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: avgScore >= 6 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${avgScore >= 6 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Recommendation</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: avgScore >= 6 ? '#10b981' : '#ef4444' }}>{rev.recommendation}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>No Reviewer Feedback Yet</div>
                <p style={{ fontSize: '0.82rem', maxWidth: 340, margin: '0 auto 1rem', lineHeight: 1.6 }}>
                  Submit a proposal for governance review. Once a reviewer evaluates it, their expert scores, notes &amp; recommendations will appear here.
                </p>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }} onClick={() => setCurrentTab('new-proposal')}>
                  Create Your First Proposal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Charts Row ── */}

      <div className="dashboard-columns" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Bar chart — Proposal Trends */}
        <div className="section-card">
          <div className="card-header">
            <div>
              <h3>Proposal Trends</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginTop: '0.15rem' }}>Monthly submissions over the last 6 months</p>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
              Last 6 months
            </span>
          </div>
          <div className="chart-container" style={{ overflowX: 'auto' }}>
            <BarChart data={monthlyData.length ? monthlyData : [
              { label: 'Jan', value: 4, type: 'default' },
              { label: 'Feb', value: 7, type: 'default' },
              { label: 'Mar', value: 5, type: 'default' },
              { label: 'Apr', value: 9, type: 'default' },
              { label: 'May', value: 11, type: 'default' },
              { label: 'Jun', value: 6, type: 'default' },
            ]} height={180} />
          </div>
        </div>

        {/* Donut — Distribution */}
        <div className="section-card">
          <div className="card-header">
            <div>
              <h3>Status Distribution</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginTop: '0.15rem' }}>All proposals by status</p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <DonutChart
              segments={donutSegments.length ? donutSegments : [
                { label: 'Approved', value: 45, color: 'var(--color-approved)' },
                { label: 'Pending',  value: 30, color: 'var(--color-underreview)' },
                { label: 'Rejected', value: 15, color: 'var(--color-rejected)' },
                { label: 'Draft',    value: 10, color: 'var(--color-draft)' },
              ]}
              size={140}
            />
            <div className="chart-legend" style={{ justifyContent: 'center' }}>
              {(donutSegments.length ? donutSegments : [
                { label: 'Approved', color: 'var(--color-approved)' },
                { label: 'Pending',  color: 'var(--color-underreview)' },
                { label: 'Rejected', color: 'var(--color-rejected)' },
                { label: 'Draft',    color: 'var(--color-draft)' },
              ]).map(s => (
                <div key={s.label} className="chart-legend-item">
                  <div className="chart-legend-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Proposal Workflow Timeline ── */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3>Proposal Workflow</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginTop: '0.15rem' }}>Standard governance pipeline stages</p>
          </div>
          <span className="badge badge-submitted" style={{ fontSize: '0.7rem' }}>Live Pipeline</span>
        </div>
        <WorkflowTimeline status="underreview" />
        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Submitted',   count: proposals.filter(p => (p.status||p.Status)==='Submitted').length,   color: 'var(--color-submitted)' },
            { label: 'Under Review', count: proposals.filter(p => (p.status||p.Status)==='UnderReview').length, color: 'var(--color-underreview)' },
            { label: 'Reviewed',    count: proposals.filter(p => (p.status||p.Status)==='Reviewed').length,    color: 'var(--color-reviewed)' },
            { label: 'Approved',    count: approved,  color: 'var(--color-approved)' },
            { label: 'Rejected',    count: rejected,  color: 'var(--color-rejected)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.label}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom: Table + Department Breakdown ── */}
      <div className="dashboard-columns" style={{ gap: '1.25rem' }}>
        {/* Proposal table */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3>Recent Proposals</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginTop: '0.15rem' }}>Latest submissions across the platform</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentTab(user.role === 'Admin' ? 'admin' : 'dashboard')}
              style={{ fontSize: '0.78rem' }}
            >
              View all →
            </button>
          </div>

          {/* Search + filter toolbar */}
          <div className="table-toolbar">
            <div className="table-search">
              <svg className="table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                placeholder="Search proposals…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search proposals"
                id="proposal-search"
              />
            </div>
            <select
              className="table-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              id="status-filter"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="UnderReview">Under Review</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="FundAllocated">Fund Allocated</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h4>No proposals found</h4>
              <p>{searchQuery || statusFilter !== 'All' ? 'Try adjusting your search or filter.' : 'No proposals have been submitted yet.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="governance-table" role="table" aria-label="Recent proposals">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const id     = p.id || p.Id;
                    const title  = p.title || p.Title || `Proposal #${id}`;
                    const status = p.status || p.Status || 'Draft';
                    const dept   = p.department || p.Department || '—';
                    const dateRaw = p.createdAt || p.CreatedAt || p.submittedAt;
                    const date   = dateRaw ? new Date(dateRaw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

                    return (
                      <tr key={id || i}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={title}>
                            {title}
                          </div>
                        </td>
                        <td><StatusBadge status={status} /></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{dept}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>{date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {proposals.length > 0 && (
            <div className="table-pagination">
              <span className="pagination-info">
                Showing {filtered.length} of {proposals.length} proposals
              </span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled aria-label="Previous page">‹</button>
                <button className="pagination-btn active" aria-label="Page 1" aria-current="page">1</button>
                <button className="pagination-btn" aria-label="Next page">›</button>
              </div>
            </div>
          )}
        </div>

        {/* Department breakdown */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3>Department Activity</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginTop: '0.15rem' }}>Proposal distribution by department</p>
            </div>
          </div>
          <div className="card-body">
            {deptEntries.length > 0 ? (
              deptEntries.map(([dept, count], i) => (
                <HBar
                  key={dept}
                  label={dept}
                  value={count}
                  max={maxDept}
                  color={deptColors[i % deptColors.length]}
                />
              ))
            ) : (
              <>
                {[['Engineering', 12], ['Finance', 9], ['Operations', 7], ['Marketing', 5], ['HR', 3]].map(([d, v], i) => (
                  <HBar key={d} label={d} value={v} max={12} color={deptColors[i]} />
                ))}
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  * Sample data shown — submit proposals to see real department stats
                </p>
              </>
            )}

            {/* Approval rate bar */}
            <div className="divider" />
            <div style={{ marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Approval Rate</span>
                <span style={{ fontWeight: 700, color: 'var(--color-approved)' }}>{compliance}%</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar green" style={{ width: `${compliance}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div style={{ height: '2rem' }} />
    </div>
  );
}
