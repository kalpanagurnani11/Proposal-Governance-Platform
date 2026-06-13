import NotificationCenter from './NotificationCenter';

export default function Navbar({ user, currentTab, handleLogout }) {
  if (!user) return null;

  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Submitter Dashboard';
      case 'new-proposal':
        return 'Submit New Proposal';
      case 'reviews':
        return 'Reviewer Evaluation Queue';
      case 'admin':
        return 'Capital Governance & Approvals';
      case 'analytics':
        return 'System Financial Analytics';
      default:
        return 'Governance Portal';
    }
  };

  return (
    <div className="top-header">
      <div className="header-title">
        <h1>{getHeaderTitle()}</h1>
      </div>
      <div className="header-actions">
        {user.department && (
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            background: 'rgba(6,182,212,0.15)',
            color: 'var(--accent-cyan)',
            padding: '0.35rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(6,182,212,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Dept: {user.department}
          </div>
        )}

        <NotificationCenter />

        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}
