// Icons as tiny inline SVG components for clean reuse
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  overview:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  feed:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  marketplace:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  proposals:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  newProposal:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  subscription: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  trust:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  verification: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  discussions:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  admin:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  analytics:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  verifyFounders:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  reviews:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  investor:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  aiAssistant:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  consultations:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  adminSubscriptions:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
};

export default function Sidebar({ user, currentTab, setCurrentTab, sidebarOpen }) {
  if (!user) return null;

  const NavItem = ({ tab, icon, label, id }) => (
    <li className="sidebar-item">
      <a
        id={id}
        className={`sidebar-link ${currentTab === tab ? 'active' : ''}`}
        onClick={() => setCurrentTab(tab)}
        role="button"
        aria-current={currentTab === tab ? 'page' : undefined}
        title={label}
      >
        {icon}
        <span>{label}</span>
      </a>
    </li>
  );

  return (
    <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`} role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <h2>Capital Gov.</h2>
          <span>Platform v1.0</span>
        </div>
      </div>

      <ul className="sidebar-menu">
        {/* === GENERAL (all roles) === */}
        <div className="sidebar-section-label">General</div>

        <NavItem tab="overview"     icon={ICONS.overview}    label="Overview"        id="nav-overview" />
        <NavItem tab="feed"         icon={ICONS.feed}        label="Community Feed"  id="nav-feed" />
        <NavItem tab="marketplace"  icon={ICONS.marketplace} label="Marketplace"     id="nav-marketplace" />

        {/* === FOUNDER === */}
        {user.role === 'Founder' && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">My Workspace</div>

            <NavItem tab="dashboard"    icon={ICONS.proposals}    label="My Proposals"    id="nav-my-proposals" />
            <NavItem tab="new-proposal" icon={ICONS.newProposal}  label="New Proposal"    id="nav-new-proposal" />
            <NavItem tab="discussions"  icon={ICONS.discussions}  label="Discussions"     id="nav-discussions" />
            <NavItem tab="ai-assistant" icon={ICONS.aiAssistant}  label="Premium AI Chat" id="nav-ai-assistant" />
            <NavItem tab="consultations" icon={ICONS.consultations} label="Expert Consult"  id="nav-consultations" />

            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Compliance</div>

            <NavItem tab="verification" icon={ICONS.verification} label="Verification"    id="nav-verification" />
            <NavItem tab="trust"        icon={ICONS.trust}        label="Trust Score"     id="nav-trust" />
            <NavItem tab="subscription" icon={ICONS.subscription} label="Subscription"    id="nav-subscription" />
          </>
        )}

        {/* === REVIEWER === */}
        {user.role === 'Reviewer' && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Reviewer Tools</div>
            <NavItem tab="reviews" icon={ICONS.reviews} label="Evaluation Queue" id="nav-eval-queue" />
            <NavItem tab="consultations" icon={ICONS.consultations} label="Consultations Queue" id="nav-consultations-rev" />
          </>
        )}

        {/* === ADMIN === */}
        {user.role === 'Admin' && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Administration</div>

            <NavItem tab="admin"               icon={ICONS.admin}          label="Governance Panel"  id="nav-admin" />
            <NavItem tab="analytics"           icon={ICONS.analytics}      label="Analytics"         id="nav-analytics" />
            <NavItem tab="verification-review" icon={ICONS.verifyFounders} label="Verify Founders"   id="nav-verify-founders" />
            <NavItem tab="admin-subscriptions" icon={ICONS.adminSubscriptions} label="Manage Subscriptions" id="nav-admin-subscriptions" />

            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Compliance</div>

            <NavItem tab="trust"        icon={ICONS.trust}        label="Trust Scores"  id="nav-trust-admin" />
            <NavItem tab="verification" icon={ICONS.verification} label="Verification"  id="nav-verification-admin" />
            <NavItem tab="subscription" icon={ICONS.subscription} label="Subscription"  id="nav-subscription-admin" />
          </>
        )}

        {/* === INVESTOR === */}
        {user.role === 'Investor' && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Investor Tools</div>

            <NavItem tab="dashboard"    icon={ICONS.investor}     label="Investor Dashboard" id="nav-investor" />
            <NavItem tab="discussions"  icon={ICONS.discussions}  label="Discussions"        id="nav-discussions-inv" />
            <NavItem tab="ai-assistant" icon={ICONS.aiAssistant}  label="Premium AI Chat"    id="nav-ai-assistant-inv" />
            <NavItem tab="consultations" icon={ICONS.consultations} label="Expert Consult"      id="nav-consultations-inv" />
            <NavItem tab="trust"        icon={ICONS.trust}        label="Trust Scores"       id="nav-trust-inv" />
            <NavItem tab="subscription" icon={ICONS.subscription} label="Subscription"       id="nav-subscription-inv" />
          </>
        )}
      </ul>

      {/* User profile at bottom */}
      <div className="sidebar-user">
        <div className="user-badge">
          <div className="user-avatar" aria-hidden="true">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h4 title={user.fullName}>{user.fullName || user.username}</h4>
            <div className="user-role-chip">{user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
