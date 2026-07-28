import { useState, useEffect } from 'react';

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active || !text) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return displayed;
}

// ── Animated score bar component ─────────────────────────────────────────────
function AiScoreBar({ label, score, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score * 10), delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  const pct = score * 10;
  const barColor = pct >= 70 ? color : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="ai-score-bar-group">
      <div className="ai-score-label">
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700 }}>
          {score}
          <span style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>/10</span>
        </span>
      </div>
      <div className="progress-container" style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: '99px',
            width: `${width}%`,
            background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
            boxShadow: `0 0 10px ${barColor}66`,
            transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}

// ── Shared AI Report Modal Component ─────────────────────────────────────────
const LOADING_STEPS = [
  'Scanning proposal metadata…',
  'Vectorising semantic content…',
  'Running Monte-Carlo risk simulation…',
  'Calibrating financial yield model…',
  'Benchmarking against 2,400+ analogues…',
  'Generating recommendation matrix…',
  'Compiling executive report…',
];

export default function AiReportModal({ report, loading, onClose }) {
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Normalise both casing variants from backend
  const summary = report?.summary ?? report?.Summary ?? '';
  const rec  = report?.recommendation ?? report?.Recommendation;
  const recColor = rec === 'Approve' ? '#10b981' : rec === 'Conditional Approve' ? '#f59e0b' : '#ef4444';

  const feas    = report?.feasibilityScore  ?? report?.FeasibilityScore  ?? 0;
  const strat   = report?.strategicScore    ?? report?.StrategicScore    ?? 0;
  const risk    = report?.riskScore         ?? report?.RiskScore         ?? 0;
  const roi     = report?.roiScore          ?? report?.RoiScore          ?? 0;
  const budget  = report?.suggestedBudget   ?? report?.SuggestedBudget   ?? 0;
  const riskTxt = report?.riskAssessment    ?? report?.RiskAssessment    ?? '';
  const roiTxt  = report?.roiAnalysis       ?? report?.RoiAnalysis       ?? '';
  const conf    = report?.confidence        ?? report?.Confidence        ?? '';
  const domain  = report?.domain            ?? report?.Domain            ?? '';
  const ts      = report?.analysisTimestamp ?? report?.AnalysisTimestamp ?? '';
  const suggTxt = report?.suggestion        ?? report?.Suggestion        ?? '';

  const summaryText = useTypewriter(
    loading ? '' : summary,
    14,
    !loading
  );

  // Cycle through loading steps for visual effect
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
    }, 900);
    return () => clearInterval(id);
  }, [loading]);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '95vw',
          background: 'linear-gradient(145deg, #0f172a, #1e293b)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          borderRadius: '16px',
          animation: 'aiModalIn 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <style>{`
          @keyframes aiModalIn {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)   scale(1); }
          }
          @keyframes scanline {
            0%   { background-position: 0 0; }
            100% { background-position: 0 100px; }
          }
          @keyframes pulse-rec { 0%,100% { box-shadow: 0 0 0 0 currentColor; } 50% { box-shadow: 0 0 0 4px transparent; } }
          .ai-loading-bar {
            height: 2px;
            background: linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent);
            background-size: 200% 100%;
            animation: shimmer 1.5s linear infinite;
          }
          @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
          .ai-meta-tag {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 10px; border-radius: 99px;
            font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
            background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08);
          }
          .ai-section {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            padding: 1rem 1.1rem;
            margin-bottom: 0.85rem;
          }
          .ai-section h4 {
            font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em;
            text-transform: uppercase; color: #64748b; margin: 0 0 0.6rem 0;
          }
          .ai-section p {
            font-size: 0.875rem; color: #cbd5e1; line-height: 1.7; margin: 0;
          }
          .ai-section p::after { content: '▋'; animation: blink 0.8s step-end infinite; }
          @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9', letterSpacing: '0.01em' }}>AI Decision Engine</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>Autonomous Proposal Evaluator v2.4</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', borderRadius: 8, width: 32, height: 32,
              cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        {/* Running progress line */}
        {loading && <div className="ai-loading-bar" style={{ margin: '0.85rem 0 0' }} />}

        {/* Body */}
        <div style={{ padding: '1.1rem 1.5rem 1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              {/* Spinning orb */}
              <div style={{ position: 'relative', width: 70, height: 70, margin: '0 auto 1.25rem' }}>
                <div style={{
                  width: 70, height: 70, borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.15)',
                  borderTopColor: '#6366f1', borderRightColor: '#06b6d4',
                  animation: 'spin 0.9s linear infinite',
                  position: 'absolute'
                }} />
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  border: '2px solid rgba(6,182,212,0.15)',
                  borderBottomColor: '#06b6d4',
                  animation: 'spin 1.4s linear infinite reverse',
                  position: 'absolute', top: 10, left: 10
                }} />
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'radial-gradient(circle, #6366f1, #06b6d4)',
                  boxShadow: '0 0 15px #6366f1',
                  position: 'absolute', top: 25, left: 25
                }} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', transition: 'all 0.3s' }}>
                {LOADING_STEPS[loadingStep]}
              </p>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: '0.75rem' }}>
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === loadingStep ? 16 : 6, height: 6,
                    borderRadius: 99,
                    background: i === loadingStep ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s'
                  }} />
                ))}
              </div>
            </div>
          ) : report && !report.error ? (
            <>
              {/* Meta tags row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {domain && <span className="ai-meta-tag">📁 {domain}</span>}
                {conf   && <span className="ai-meta-tag">🎯 Confidence {conf}</span>}
                {ts     && <span className="ai-meta-tag">🕐 {ts}</span>}
              </div>

              {/* Recommendation + Budget */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 1.1rem', borderRadius: 99,
                  background: `${recColor}18`,
                  border: `1px solid ${recColor}55`,
                  color: recColor, fontWeight: 700, fontSize: '0.9rem',
                  animation: 'aiModalIn 0.4s',
                }}>
                  {rec === 'Approve' ? '✅' : rec === 'Conditional Approve' ? '⚡' : '❌'}
                  {rec}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Suggested Budget</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', color: '#f1f5f9', fontWeight: 700 }}>
                    {budget?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Executive Summary with typewriter */}
              <div className="ai-section">
                <h4>🧠 Executive Summary</h4>
                <p style={{ minHeight: '2.5em' }}>{summaryText}</p>
              </div>

              {/* Score bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1rem' }}>
                <AiScoreBar label="⚙️  Technical Feasibility" score={feas}  color="#6366f1" delay={100} />
                <AiScoreBar label="🎯  Strategic Alignment"   score={strat} color="#06b6d4" delay={250} />
                <AiScoreBar label="🛡️  Risk Safety Index"      score={risk}  color="#10b981" delay={400} />
                <AiScoreBar label="💰  ROI Potential"          score={roi}   color="#f59e0b" delay={550} />
              </div>

              {/* Risk Assessment */}
              <div className="ai-section">
                <h4>⚠️ Risk Factor Profile</h4>
                <p>{riskTxt}</p>
              </div>

              {/* ROI Analysis */}
              <div className="ai-section">
                <h4>📈 Financial Yield Analysis</h4>
                <p>{roiTxt}</p>
              </div>

              {/* Actionable Suggestion */}
              {suggTxt && (
                <div className="ai-section">
                  <h4>💡 Actionable Suggestion</h4>
                  <p>{suggTxt}</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-rejected)', marginBottom: '1rem' }}>
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p style={{ color: 'var(--color-rejected)', fontWeight: '600' }}>
                {report?.error || 'AI Engine returned no data. Please try again.'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Please make sure the backend is running and the CORS policy allows requests from your current origin.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'flex-end', gap: '0.6rem'
          }}>
            <button className="btn btn-secondary" onClick={onClose}
              style={{ borderRadius: 8, fontSize: '0.85rem' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
