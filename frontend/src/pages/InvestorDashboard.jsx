import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToDashboardUpdates } from '../services/signalr';

export default function InvestorDashboard({ setCurrentTab, setDiscussionId }) {
  const [approvedProposals, setApprovedProposals] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investNotes, setInvestNotes] = useState('');
  const [investError, setInvestError] = useState('');
  const [investing, setInvesting] = useState(false);

  const fetchData = async () => {
    try {
      const [props, port, sum] = await Promise.all([
        api.get('/investor/approved-proposals'),
        api.get('/investor/portfolio'),
        api.get('/investor/portfolio/summary')
      ]);
      setApprovedProposals(Array.isArray(props) ? props : []);
      setPortfolio(Array.isArray(port) ? port : []);
      setSummary(sum);
    } catch (err) {
      console.error('Error fetching investor data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeToDashboardUpdates(() => fetchData());
    return () => unsubscribe();
  }, []);

  const handleInvest = async (e) => {
    e.preventDefault();
    setInvestError('');

    if (!investAmount || parseFloat(investAmount) <= 0) {
      setInvestError('Enter a valid investment amount.');
      return;
    }

    setInvesting(true);
    try {
      await api.post('/investor/invest', {
        proposalId: selectedProposal.id,
        amount: parseFloat(investAmount),
        notes: investNotes
      });
      setShowInvestModal(false);
      setInvestAmount('');
      setInvestNotes('');
      setSelectedProposal(null);
      fetchData();
    } catch (err) {
      setInvestError(err.message || 'Investment failed.');
    } finally {
      setInvesting(false);
    }
  };

  const fmt = (n) => (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="page-container">
      {/* Portfolio Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Total Committed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.95)' }}>{fmt(summary?.totalCommitted)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Total Disbursed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{fmt(summary?.totalDisbursed)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Active Investments</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.9)' }}>{summary?.activeInvestments ?? 0}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))', border: '1px solid rgba(236,72,153,0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>Total Investments</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'rgba(236,72,153,0.9)' }}>{summary?.totalInvestments ?? 0}</div>
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Left: Approved Proposals to Invest */}
        <div>
          <div className="table-card">
            <div className="card-header">
              <h3>📊 Investment Opportunities</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {approvedProposals.filter(p => !p.isFullyFunded).length} open
              </span>
            </div>
            {approvedProposals.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No approved proposals available for investment yet.
              </p>
            ) : (
              <table className="governance-table">
                <thead>
                  <tr>
                    <th>Startup / Proposal</th>
                    <th>Equity</th>
                    <th>Approved</th>
                    <th>Funded</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedProposals.map((prop) => {
                    const pct = prop.approvedAmount > 0 ? Math.round((prop.totalInvested / prop.approvedAmount) * 100) : 0;
                    return (
                      <tr key={prop.id}>
                        <td>
                          <div style={{ fontWeight: '500' }}>{prop.title}</div>
                          {prop.startupName && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '0.1rem 0.45rem', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(165,180,252,0.85)', fontWeight: '600' }}>🚀 {prop.startupName}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{prop.department} · {prop.submitterName}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(165,180,252,0.85)' }}>
                          {prop.equityOffered != null ? `${prop.equityOffered}%` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{fmt(prop.approvedAmount)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                              <div style={{
                                width: `${Math.min(pct, 100)}%`,
                                height: '100%',
                                background: pct >= 100
                                  ? 'var(--accent-secondary)'
                                  : 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(165,180,252,0.8))',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: pct >= 100 ? 'var(--accent-secondary)' : 'var(--text-secondary)', minWidth: '35px' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {prop.isFullyFunded ? (
                            <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>Fully Funded</span>
                          ) : (
                            <span className="badge badge-submitted" style={{ fontSize: '0.7rem' }}>Open</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {!prop.isFullyFunded && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', margin: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProposal(prop);
                                  setInvestAmount('');
                                  setInvestNotes('');
                                  setInvestError('');
                                  setShowInvestModal(true);
                                }}
                              >
                                💰 Invest
                              </button>
                            )}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', margin: 0 }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const room = await api.post('/discussions/start', { proposalId: prop.id });
                                  setDiscussionId(room.id);
                                  setCurrentTab('discussions');
                                } catch (err) {
                                  console.error('Error starting discussion:', err);
                                  alert('Could not open discussion room.');
                                }
                              }}
                            >
                              💬 Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: My Portfolio */}
        <div>
          <div className="table-card">
            <div className="card-header">
              <h3>💼 My Portfolio</h3>
            </div>
            {portfolio.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                You haven't invested in any proposals yet. Browse opportunities on the left.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                {portfolio.map((inv) => (
                  <div key={inv.id} style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1rem',
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{inv.proposalTitle}</h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{inv.proposalDepartment}</span>
                      </div>
                      <span className={`badge ${inv.proposalStatus === 'FundAllocated' ? 'badge-fundallocated' : inv.proposalStatus === 'Approved' ? 'badge-approved' : ''}`} style={{ fontSize: '0.7rem' }}>
                        {inv.proposalStatus}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>My Commitment</span>
                        <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.95)', marginTop: '0.15rem' }}>
                          {fmt(inv.committedAmount)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Disbursed</span>
                        <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)', marginTop: '0.15rem' }}>
                          {fmt(inv.totalDisbursed)} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({inv.disbursementPercent}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: '0.6rem' }}>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${inv.disbursementPercent}%`,
                          height: '100%',
                          background: inv.disbursementPercent >= 100 ? 'var(--accent-secondary)' : 'linear-gradient(90deg, rgba(99,102,241,0.7), rgba(165,180,252,0.7))',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    {inv.notes && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        📝 {inv.notes}
                      </p>
                    )}

                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Invested: {new Date(inv.investedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INVEST MODAL */}
      {showInvestModal && selectedProposal && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '500px', animation: 'scaleIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💰 Commit Investment
              </h3>
              <button className="btn-close" onClick={() => setShowInvestModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {/* Proposal Info */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  {selectedProposal.startupName && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '0.15rem 0.6rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(165,180,252,0.85)', fontWeight: '600' }}>🚀 {selectedProposal.startupName}</span>
                    </div>
                  )}
                  <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>{selectedProposal.title}</h4>
                  {selectedProposal.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0', lineHeight: '1.5' }}>{selectedProposal.description}</p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Approved</span>
                      <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '0.1rem' }}>{fmt(selectedProposal.approvedAmount)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Remaining</span>
                      <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.9)', marginTop: '0.1rem' }}>{fmt(selectedProposal.remainingToFund)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Equity</span>
                      <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'rgba(165,180,252,0.9)', marginTop: '0.1rem' }}>{selectedProposal.equityOffered != null ? `${selectedProposal.equityOffered}%` : '—'}</div>
                    </div>
                  </div>
                  {selectedProposal.investorCount > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      👥 {selectedProposal.investorCount} investor{selectedProposal.investorCount > 1 ? 's' : ''} already committed {fmt(selectedProposal.totalInvested)}
                    </div>
                  )}
                  {selectedProposal.demoVideoUrl && (
                    <a href={selectedProposal.demoVideoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', textDecoration: 'underline' }}>
                      🎬 Watch Demo Video ↗
                    </a>
                  )}
                </div>

              {investError && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-rejected)', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  {investError}
                </div>
              )}

              <form onSubmit={handleInvest}>
                <div className="form-group">
                  <label>Investment Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder={`Max: ${selectedProposal.remainingToFund?.toLocaleString()}`}
                    max={selectedProposal.remainingToFund}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                {/* Quick buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.3rem', fontSize: '0.72rem', margin: 0 }}
                      onClick={() => setInvestAmount((selectedProposal.remainingToFund * pct / 100).toFixed(2))}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="form-group">
                  <label>Investment Notes <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span></label>
                  <textarea
                    className="form-textarea"
                    value={investNotes}
                    onChange={(e) => setInvestNotes(e.target.value)}
                    placeholder="e.g. Interested in the AI component of this project..."
                    rows={2}
                    style={{ minHeight: '60px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInvestModal(false)} style={{ margin: 0 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={investing} style={{ margin: 0 }}>
                    {investing ? 'Processing...' : `Commit ${investAmount ? fmt(parseFloat(investAmount)) : ''}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
