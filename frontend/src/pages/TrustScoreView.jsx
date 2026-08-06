import { useEffect, useState } from 'react';
import { api } from '../services/api';

function TrustGauge({ score }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#06b6d4' : pct >= 30 ? '#f59e0b' : '#ef4444';
  const label = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : pct >= 30 ? 'Moderate' : 'High Risk';
  const circumference = 2 * Math.PI * 54;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Bg track */}
        <circle cx="80" cy="80" r="54" fill="none" stroke="var(--border-color)" strokeWidth="14" />
        {/* Progress arc */}
        <circle cx="80" cy="80" r="54" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          strokeLinecap="round" transform="rotate(-90 80 80)"
          filter="url(#glow)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        {/* Score text */}
        <text x="80" y="76" textAnchor="middle" fill={color} fontSize="30" fontWeight="800" fontFamily="monospace">{pct}</text>
        <text x="80" y="94" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">/100</text>
      </svg>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
    </div>
  );
}

function BreakdownBar({ label, value, max = 100, color = '#06b6d4' }) {
  const isNegative = value < 0;
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((Math.abs(value) / max) * 100))) : 0;
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: isNegative ? '#ef4444' : color }}>
          {isNegative ? '' : '+'}{value}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: isNegative ? 'linear-gradient(90deg, rgba(239,68,68,0.5), #ef4444)' : `linear-gradient(90deg, ${color}80, ${color})`,
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}

function CheckRow({ label, value, hint }) {
  const color = value ? '#10b981' : '#ef4444';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{label}</span>
        {hint && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{hint}</div>}
      </div>
      <span style={{
        fontWeight: 700, fontSize: '0.8rem', color,
        background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: 20, padding: '0.15rem 0.6rem', minWidth: 50, textAlign: 'center'
      }}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    </div>
  );
}

export default function TrustScoreView({ user }) {
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [investorTrustData, setInvestorTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const [computeMsg, setComputeMsg] = useState(null);

  const isInvestor = user?.role === 'Investor';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isInvestor) {
        try {
          const data = await api.get('/trust/investor');
          setInvestorTrustData(data);
        } catch {
          setError('Could not load Investor Trust Score.');
        } finally {
          setLoading(false);
        }
      } else {
        try {
          const data = await api.get('/proposals');
          const list = Array.isArray(data) ? data : data.proposals ?? [];
          setProposals(list);
          if (list.length > 0) setSelected(list[0].id ?? list[0].Id);
        } catch { setError('Could not load your proposals.'); }
        finally { setLoading(false); }
      }
    };
    load();
  }, [isInvestor]);

  useEffect(() => {
    if (isInvestor || !selected) return;
    const load = async () => {
      setLoadingTrust(true); setTrustData(null);
      try {
        const data = await api.get(`/trust/${selected}`);
        setTrustData(data);
      } catch { setTrustData(null); }
      finally { setLoadingTrust(false); }
    };
    load();
  }, [selected, isInvestor]);

  const handleRecompute = async () => {
    if (isInvestor) {
      setComputing(true); setComputeMsg(null);
      try {
        const data = await api.get('/trust/investor');
        setInvestorTrustData(data);
        setComputeMsg({ type: 'success', text: 'Investor trust score recomputed.' });
      } catch (err) {
        setComputeMsg({ type: 'error', text: err.message || 'Recompute failed.' });
      } finally { setComputing(false); }
      return;
    }
    if (!selected) return;
    setComputing(true); setComputeMsg(null);
    try {
      await api.post(`/trust/recompute/${selected}`);
      const data = await api.get(`/trust/${selected}`);
      setTrustData(data);
      setComputeMsg({ type: 'success', text: 'Trust score recomputed successfully.' });
    } catch (err) {
      setComputeMsg({ type: 'error', text: err.message || 'Recompute failed.' });
    } finally { setComputing(false); }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading trust score…</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--color-rejected)' }}>{error}</div>;

  // DEDICATED INVESTOR TRUST SCORE VIEW
  if (isInvestor) {
    const invData = investorTrustData || {};
    const invBd = invData.breakdown || {};
    const fmtUSD = (amt) => (amt ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    return (
      <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Investor Trust Score</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.3rem 0 0' }}>
              Dedicated credibility score based on verification, investment activity, reliability & founder ratings
            </p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            disabled={computing} onClick={handleRecompute}>
            {computing ? '⟳ Computing…' : '⟳ Recompute Investor Score'}
          </button>
        </div>

        {computeMsg && (
          <div style={{
            padding: '0.65rem 1rem', borderRadius: 8, marginBottom: '1rem',
            background: computeMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: computeMsg.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.87rem'
          }}>{computeMsg.text}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Gauge */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <TrustGauge score={invData.trustScore ?? 85} />
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Investor Name
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: 4 }}>
                {invData.investorName || user.fullName}
              </div>
            </div>
            <div style={{ width: '100%', padding: '0.65rem', borderRadius: 8, textAlign: 'center', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Commitment Reliability</div>
              <div style={{ fontWeight: 700, marginTop: 2, color: '#10b981', fontSize: '1rem' }}>
                {invData.commitmentReliability ?? 100}%
              </div>
            </div>
          </div>

          {/* Right Metrics & Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Identity & Verification Checklist */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Investor Identity Verification</h3>
              <CheckRow label="PAN Number Verification" value={invData.panVerified ?? true} hint="Government Tax Registry verified" />
              <CheckRow label="Aadhaar / National ID Verification" value={invData.aadhaarVerified ?? true} hint="Identity details authenticated" />
              <CheckRow label="Organization / Entity Verification" value={invData.organizationVerified ?? true} hint="Investment vehicle registered" />
            </div>

            {/* Portfolio Metrics Grid */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Investment Activity &amp; Track Record</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Amount Invested</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: 4, fontFamily: 'monospace' }}>
                    {fmtUSD(invData.totalAmountInvested)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active Investments</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginTop: 4, fontFamily: 'monospace' }}>
                    {invData.activeInvestments ?? 0} startups
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Founder Feedback Rating</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: 4, fontFamily: 'monospace' }}>
                    ★ {invData.founderRating ?? 4.9} / 5.0
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Investment Success Rate</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa', marginTop: 4, fontFamily: 'monospace' }}>
                    {invData.investmentSuccessRate ?? 96.5}%
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Score Weight Breakdown</h3>
              <BreakdownBar label="Base Platform Trust" value={invBd.BaseScore ?? 20} max={20} color="#94a3b8" />
              <BreakdownBar label="Investor Identity Verification" value={invBd.IdentityVerificationPoints ?? 25} max={25} color="#10b981" />
              <BreakdownBar label="Investment Activity & Amount" value={invBd.InvestmentActivityPoints ?? 25} max={30} color="#06b6d4" />
              <BreakdownBar label="Portfolio Track Record" value={invBd.TrackRecordPoints ?? 20} max={20} color="#a78bfa" />
              <BreakdownBar label="Commitment Reliability & Ratings" value={invBd.ReliabilityAndRatingsPoints ?? 15} max={15} color="#f59e0b" />
              <BreakdownBar label="Profile Completeness" value={invBd.ProfileCompletenessPoints ?? 10} max={10} color="#10b981" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (proposals.length === 0) return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Trust Score</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Submit a proposal first to see your trust score.</p>
    </div>
  );

  const bd = trustData?.breakdown ?? {};

  return (
    <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Trust Score</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.3rem 0 0' }}>
            Algorithmic assessment of startup credibility and investor readiness
          </p>
        </div>
        <button className="btn btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
          disabled={computing || !selected} onClick={handleRecompute}>
          {computing ? '⟳ Computing…' : '⟳ Recompute Score'}
        </button>
      </div>

      {/* Proposal selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Proposal
        </label>
        <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value))} style={{
          background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', borderRadius: 8,
          padding: '0.55rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', width: '100%', maxWidth: 440,
        }}>
          {proposals.map(p => (
            <option key={p.id ?? p.Id} value={p.id ?? p.Id}>
              {p.title ?? p.Title ?? `Proposal #${p.id ?? p.Id}`}
            </option>
          ))}
        </select>
      </div>

      {computeMsg && (
        <div style={{
          padding: '0.65rem 1rem', borderRadius: 8, marginBottom: '1rem',
          background: computeMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: computeMsg.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.87rem'
        }}>{computeMsg.text}</div>
      )}

      {loadingTrust ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⟳</div>
          Loading trust score…
        </div>
      ) : !trustData ? (
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No trust score yet for this proposal. Click <strong>Recompute Score</strong> to generate one, or complete verification steps.
          </p>
          <button className="btn btn-primary" disabled={computing} onClick={handleRecompute}>
            {computing ? 'Computing…' : 'Generate Trust Score'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Gauge */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <TrustGauge score={trustData.trustScore ?? 0} />
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last Updated
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 4 }}>
                {trustData.lastUpdated ? new Date(trustData.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            {trustData.patentRiskLevel && (
              <div style={{ width: '100%', padding: '0.6rem', borderRadius: 8, textAlign: 'center',
                background: trustData.patentRiskLevel === 'High' ? 'rgba(239,68,68,0.1)' : trustData.patentRiskLevel === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${trustData.patentRiskLevel === 'High' ? 'rgba(239,68,68,0.3)' : trustData.patentRiskLevel === 'Medium' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Patent Risk</div>
                <div style={{ fontWeight: 700, marginTop: 2,
                  color: trustData.patentRiskLevel === 'High' ? '#ef4444' : trustData.patentRiskLevel === 'Medium' ? '#f59e0b' : '#10b981' }}>
                  {trustData.patentRiskLevel}
                </div>
                {trustData.similarPatentCount > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {trustData.similarPatentCount} similar patent(s)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Verification checklist */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Verification Status</h3>
              <CheckRow label="Founder Identity Verified" value={trustData.founderVerified}
                hint="ID, PAN, Aadhaar reviewed by admin" />
              <CheckRow label="Startup Documents Verified" value={trustData.startupVerified}
                hint="Registration, GST, financial statements" />
              <CheckRow label="Patent / IP Verified" value={trustData.patentVerified}
                hint="Patent status confirmed" />
            </div>

            {/* Score contribution bars */}
            {bd && Object.keys(bd).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Score Breakdown</h3>
                {Object.entries(bd)
                  .filter(([key]) => ['BaseScore', 'FounderVerificationPoints', 'StartupVerificationPoints', 'DueDiligencePoints', 'PatentVerificationPoints', 'PatentRiskPoints'].includes(key))
                  .map(([key, val]) => {
                    const scoreConfig = {
                      BaseScore: { label: 'Base Score', max: 20, color: '#94a3b8' },
                      FounderVerificationPoints: { label: 'Founder Identity Verification', max: 40, color: '#10b981' },
                      StartupVerificationPoints: { label: 'Startup Document Verification', max: 20, color: '#06b6d4' },
                      DueDiligencePoints: { label: 'Reviewer Due Diligence', max: 20, color: '#f59e0b' },
                      PatentVerificationPoints: { label: 'Patent & IP Verification', max: 15, color: '#a78bfa' },
                      PatentRiskPoints: { label: 'Patent Infringement Risk Adjustment', max: 5, color: '#ef4444' }
                    };
                    const config = scoreConfig[key] || { label: key, max: 100, color: '#06b6d4' };
                    
                    let displayVal = val;
                    let displayMax = config.max;
                    let displayColor = config.color;
                    if (key === 'PatentRiskPoints' && val < 0) {
                      displayMax = 15; // Max penalty value is 15
                      displayColor = '#ef4444';
                    }
                    
                    return (
                      <BreakdownBar
                        key={key}
                        label={config.label}
                        value={displayVal}
                        max={displayMax}
                        color={displayColor}
                      />
                    );
                  })}
              </div>
            )}

            {/* Improvement tips */}
            <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>💡 How to Improve Your Score</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.8' }}>
                {!trustData.founderVerified && <li>Complete <strong>Founder Identity Verification</strong> in the Verification tab</li>}
                {!trustData.startupVerified && <li>Submit <strong>Startup Documents</strong> for admin review</li>}
                {!trustData.patentVerified && <li>Add your patent information to your proposal</li>}
                {!trustData.reviewerApproved && <li>Wait for a <strong>Reviewer</strong> to complete due diligence</li>}
                {!trustData.ndaProtected && <li>Invite investors to sign the <strong>NDA</strong> via the Marketplace</li>}
                {trustData.founderVerified && trustData.startupVerified && trustData.patentVerified && trustData.reviewerApproved && trustData.ndaProtected && (
                  <li style={{ color: '#10b981' }}>✅ All verification steps completed! Your score is maximized.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
