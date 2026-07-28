import { useState, useRef, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

const TAB_TITLES = {
  overview:             { label: 'Dashboard Overview', icon: '📊' },
  dashboard:            { label: 'My Proposals', icon: '📁' },
  'new-proposal':       { label: 'Submit New Proposal', icon: '✏️' },
  feed:                 { label: 'Community Feed', icon: '💬' },
  marketplace:          { label: 'Proposal Marketplace', icon: '🏪' },
  discussions:          { label: 'Discussion Rooms', icon: '💬' },
  reviews:              { label: 'Evaluation Queue', icon: '📋' },
  admin:                { label: 'Governance & Approvals', icon: '🏛️' },
  analytics:            { label: 'System Analytics', icon: '📈' },
  'verification-review':{ label: 'Verify Founders', icon: '🔎' },
  subscription:         { label: 'Subscription Plans', icon: '💳' },
  trust:                { label: 'Trust Scores', icon: '🔒' },
  verification:         { label: 'Verification Centre', icon: '✅' },
};

export default function Navbar({ user, currentTab, handleLogout, theme, toggleTheme, onMenuClick }) {
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  const pageInfo = TAB_TITLES[currentTab] || { label: 'Governance Portal', icon: '🏛️' };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  return (
    <header className="top-header">
      {/* Left — mobile menu + breadcrumb */}
      <div className="header-left">
        {/* Mobile hamburger */}
        <button
          className="icon-btn"
          onClick={onMenuClick}
          style={{ display: 'none' }}
          aria-label="Toggle menu"
          id="mobile-menu-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-breadcrumb">
          <span
            style={{ color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            onClick={() => {}}
          >
            Platform
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <h1>{pageInfo.label}</h1>
        </div>
      </div>

      {/* Center — global search */}
      <div className="header-search" aria-label="Global search">
        <svg className="header-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          placeholder="Search proposals, users..."
          aria-label="Search proposals"
          id="global-search"
        />
      </div>

      {/* Right — actions */}
      <div className="header-actions">
        {/* Department chip */}
        {user.department && (
          <span className="dept-badge" title={`Department: ${user.department}`}>
            {user.department}
          </span>
        )}

        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          id="theme-toggle-btn"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <div className="theme-toggle-thumb">
            {theme === 'dark' ? '🌙' : '☀️'}
          </div>
        </button>

        {/* Notifications */}
        <div className="notification-bell">
          <NotificationCenter />
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="profile-btn"
            onClick={() => setShowProfile(v => !v)}
            aria-label="Profile menu"
            id="profile-menu-btn"
          >
            <div className="user-avatar" aria-hidden="true">
              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <span title={user.fullName}>{user.fullName?.split(' ')[0] || user.username}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfile && (
            <div className="profile-dropdown" role="menu" aria-label="Profile menu">
              <div className="profile-dropdown-header">
                <p>{user.fullName || user.username}</p>
                <span>{user.email || user.role}</span>
              </div>

              <button
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setShowProfile(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                My Profile
              </button>

              <button
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => { toggleTheme(); setShowProfile(false); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />

              <button
                className="profile-dropdown-item danger"
                role="menuitem"
                onClick={() => { handleLogout(); setShowProfile(false); }}
                id="logout-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
