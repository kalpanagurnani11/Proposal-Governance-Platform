import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const data = await api.get('/analytics/dashboard');
      setMetrics(data);
    } catch (err) {
      console.error('Error loading analytics metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const unsubscribe = subscribeToDashboardUpdates(() => {
      fetchMetrics();
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="page-container text-center" style={{ padding: '4rem 2rem' }}>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="page-container text-center" style={{ padding: '4rem 2rem', color: 'var(--color-rejected)' }}>
        <p>Failed to load analytics platform data.</p>
      </div>
    );
  }

  const {
  CapitalPool = {},
  StatusDistribution = [],
  DepartmentSummary = [],
  RecentTransactions = [],
  AverageScores = {},
  Predictive = {}
} = metrics || {};

  // Visual Helper for SVG charts
  const maxRequested = DepartmentSummary.length > 0 
    ? Math.max(...DepartmentSummary.map(d => d.TotalRequested)) 
    : 100000;

  return (
    <div className="page-container">
      {/* Metrics Row */}
      <div className="metrics-grid">
  <div className="metric-card">
    <div className="metric-header">Global Capital Pool</div>
    <div className="metric-value">
      {(CapitalPool?.totalPool ?? 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}
    </div>
    <div className="metric-footer">Total authorized capital limit</div>
  </div>

  <div className="metric-card amber">
    <div className="metric-header">Allocated Capital</div>
    <div className="metric-value">
      {(CapitalPool?.allocated ?? 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}
    </div>
    <div className="metric-footer">Committed to approved projects</div>
  </div>

  <div className="metric-card emerald">
    <div className="metric-header">Remaining Capital Pool</div>
    <div className="metric-value">
      {(CapitalPool?.remaining ?? 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}
    </div>
    <div className="metric-footer">Free unallocated capital balance</div>
  </div>

  <div className="metric-card cyan">
    <div className="metric-header">Disbursed Funds</div>
    <div className="metric-value">
      {(CapitalPool?.disbursed ?? 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}
    </div>
    <div className="metric-footer">Actual drawdown expenses executed</div>
  </div>
</div>
      <div className="dashboard-columns">
        {/* Left Column: Charts and Projections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Department spending SVG bar chart */}
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Requested Capital by Corporate Department</h3>
            
            {DepartmentSummary.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No department data available.</p>
            ) : (
              <div style={{ padding: '0 1rem' }}>
                <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', background: 'transparent' }}>
                  {DepartmentSummary.map((dept, index) => {
                    const barHeight = maxRequested > 0 ? (dept.TotalRequested / maxRequested) * 150 : 0;
                    const x = 50 + index * 90;
                    const y = 170 - barHeight;

                    return (
                      <g key={dept.Department}>
                        {/* Bar */}
                        <rect
                          x={x}
                          y={y}
                          width="45"
                          height={barHeight}
                          rx="4"
                          fill="url(#barGradient)"
                          className="chart-bar"
                          style={{ transition: 'all 0.5s ease-out' }}
                        />
                        {/* Value Text */}
                        <text
                          x={x + 22.5}
                          y={y - 8}
                          textAnchor="middle"
                          fill="var(--text-primary)"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="var(--font-mono)"
                        >
                          {dept.TotalRequested >= 1000000 
                            ? `$${(dept.TotalRequested / 1000000).toFixed(1)}M` 
                            : `$${(dept.TotalRequested / 1000).toFixed(0)}k`}
                        </text>
                        {/* Label */}
                        <text
                          x={x + 22.5}
                          y="190"
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          fontSize="10"
                          fontWeight="500"
                        >
                          {dept.Department}
                        </text>
                      </g>
                    );
                  })}
                  {/* Baseline */}
                  <line x1="30" y1="172" x2="470" y2="172" stroke="var(--border-hover)" strokeWidth="1" />

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-cyan)" />
                      <stop offset="100%" stopColor="var(--accent-primary)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>

          {/* Predictive Analytics Section */}
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Governance Predictive Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Projected Demand Per Proposal
                </span>
                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--accent-cyan)', margin: '0.5rem 0' }}>
                  {(Predictive?.projectedAverageDemand ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Based on historical trends of organization-wide proposal sizes.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Capital Exhaustion Runway
                </span>
                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--color-underreview)', margin: '0.5rem 0' }}>
                  ~{Predictive.RemainingDaysCapitalRunsOut} Days
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Estimated timeframe before the remaining capital pool is fully allocated based on current velocity.
                </p>
              </div>

            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>AI Recommendation Summary:</strong> The department of <strong>{Predictive.TopDepartment}</strong> exhibits the highest demand for capital funding. To secure capital reserves, the board is advised to prioritize projects exhibiting Technical Feasibility scores above <strong>7.5/10</strong> and ROI Potential index over <strong>8/10</strong>.
            </div>
          </div>
        </div>

        {/* Right Column: Score Averages & Transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Average Criteria Scores */}
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Aggregated Reviewer Scores</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Technical Feasibility</span>
                  <strong>{AverageScores.feasibility}/10</strong>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${AverageScores.feasibility * 10}%`, backgroundColor: 'var(--accent-primary)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Strategic Alignment</span>
                  <strong>{AverageScores.strategic}/10</strong>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${AverageScores.strategic * 10}%`, backgroundColor: 'var(--accent-secondary)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Risk Mitigation (Safety)</span>
                  <strong>{AverageScores.risk}/10</strong>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${AverageScores.risk * 10}%`, backgroundColor: 'var(--color-rejected)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Projected Financial ROI</span>
                  <strong>{AverageScores.roi}/10</strong>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${AverageScores.roi * 10}%`, backgroundColor: 'var(--accent-cyan)' }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Capital Transactions */}
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recent Capital Activities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '310px', overflowY: 'auto' }}>
              {RecentTransactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No transaction history.</p>
              ) : (
                RecentTransactions.map((tx) => (
                  <div
                    key={tx.Id}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: tx.Type === 'Allocation' ? 'var(--accent-secondary)' : 'var(--accent-cyan)' }}>
                        {tx.Type.toUpperCase()}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        {tx.Description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)', display: 'block' }}>
                        {tx.Type === 'Allocation' ? '+' : '-'}{Number(tx.amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.TransactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
