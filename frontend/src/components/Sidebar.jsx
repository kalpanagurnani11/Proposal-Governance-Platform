export default function Sidebar({ user, currentTab, setCurrentTab }) {
  if (!user) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>CAPITAL GOVERNANCE</h2>
        <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem', letterSpacing: '1px' }}>
          PLATFORM v1.0
        </div>
      </div>

      <ul className="sidebar-menu">
        {/* Submitter Menu */}
        {user.role === 'Submitter' && (
          <>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${currentTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentTab('dashboard')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9"></rect>
                  <rect x="14" y="3" width="7" height="5"></rect>
                  <rect x="14" y="12" width="7" height="9"></rect>
                  <rect x="3" y="16" width="7" height="5"></rect>
                </svg>
                My Proposals
              </a>
            </li>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${currentTab === 'new-proposal' ? 'active' : ''}`}
                onClick={() => setCurrentTab('new-proposal')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                New Proposal
              </a>
            </li>
          </>
        )}

        {/* Reviewer Menu */}
        {user.role === 'Reviewer' && (
          <li className="sidebar-item">
            <a
              className={`sidebar-link ${currentTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setCurrentTab('reviews')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Evaluation Queue
            </a>
          </li>
        )}

        {/* Admin Menu */}
        {user.role === 'Admin' && (
          <>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${currentTab === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentTab('admin')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                Governance Panel
              </a>
            </li>
            <li className="sidebar-item">
              <a
                className={`sidebar-link ${currentTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setCurrentTab('analytics')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                </svg>
                System Analytics
              </a>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-user">
        <div className="user-badge">
          <div className="user-avatar">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h4>{user.fullName}</h4>
            <p>{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
