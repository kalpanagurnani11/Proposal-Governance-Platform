import { useState, useEffect } from 'react';
import { initSignalR, stopSignalR } from './services/signalr';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import FounderDashboard from './pages/FounderDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import InvestorDashboard from './pages/InvestorDashboard';
import SocialFeed from './pages/SocialFeed';
import ProposalMarketplace from './pages/ProposalMarketplace';
import DiscussionRoom from './pages/DiscussionRoom';
import SubscriptionPlans from './pages/SubscriptionPlans';
import TrustScoreView from './pages/TrustScoreView';
import VerificationDashboard from './pages/VerificationDashboard';
import VerificationReviewPage from './pages/VerificationReviewPage';
import DashboardOverview from './pages/DashboardOverview';
import PremiumAIChat from './components/PremiumAIChat';
import ConsultationHub from './pages/ConsultationHub';
import AdminSubscriptionManager from './pages/AdminSubscriptionManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [discussionId, setDiscussionId] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsedUser);
      setCurrentTab('overview');
      initSignalR(parsedUser.id, parsedUser.role);
    }
  }, []);

  const handleLoginSuccess = (authData) => {
    const userProfile = {
      id: authData.id,
      username: authData.username,
      role: authData.role,
      fullName: authData.fullName,
      email: authData.email,
      department: authData.department,
      patentId: authData.patentId,
      patentVerificationStatus: authData.patentVerificationStatus,
      patentDetailsJson: authData.patentDetailsJson
    };

    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userProfile));

    setToken(authData.token);
    setUser(userProfile);
    setCurrentTab('overview');
    initSignalR(userProfile.id, userProfile.role);
  };

  const handleLogout = () => {
    localStorage.clear();
    localStorage.setItem('theme', theme); // keep theme on logout
    stopSignalR();
    setToken(null);
    setUser(null);
    setIsRegistering(false);
    setCurrentTab('dashboard');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Auth views
  if (!user) {
    if (isRegistering) {
      return (
        <Register
          onRegisterSuccess={() => setIsRegistering(false)}
          switchToLogin={() => setIsRegistering(false)}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        switchToRegister={() => setIsRegistering(true)}
      />
    );
  }

  const renderContent = () => {
    // Overview / Home dashboard (new)
    if (currentTab === 'overview') {
      return <DashboardOverview user={user} setCurrentTab={setCurrentTab} />;
    }

    if (currentTab === 'feed') {
      return <SocialFeed />;
    }
    if (currentTab === 'marketplace') {
      return (
        <ProposalMarketplace
          user={user}
          setCurrentTab={setCurrentTab}
          setDiscussionId={setDiscussionId}
        />
      );
    }
    if (currentTab === 'discussions') {
      return (
        <DiscussionRoom
          user={user}
          discussionId={discussionId}
          setDiscussionId={setDiscussionId}
        />
      );
    }

    if (user.role === 'Founder') {
      if (currentTab === 'subscription') return <SubscriptionPlans user={user} />;
      if (currentTab === 'trust')        return <TrustScoreView user={user} />;
      if (currentTab === 'verification') return <VerificationDashboard user={user} />;
      if (currentTab === 'ai-assistant') return <PremiumAIChat user={user} userRole="Founder" setCurrentTab={setCurrentTab} />;
      if (currentTab === 'consultations') return <ConsultationHub user={user} userRole="Founder" setCurrentTab={setCurrentTab} />;
      return (
        <FounderDashboard
          user={user}
          setUser={setUser}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
        />
      );
    }

    if (user.role === 'Reviewer') {
      if (currentTab === 'consultations') return <ConsultationHub user={user} userRole="Reviewer" setCurrentTab={setCurrentTab} />;
      if (currentTab === 'dashboard') return <FounderDashboard user={user} setUser={setUser} currentTab={currentTab} setCurrentTab={setCurrentTab} />;
    }

    if (user.role === 'Admin') {
      if (currentTab === 'admin')               return <AdminDashboard />;
      if (currentTab === 'analytics')           return <AnalyticsDashboard />;
      if (currentTab === 'verification-review') return <VerificationReviewPage user={user} />;
      if (currentTab === 'subscription')        return <SubscriptionPlans user={user} />;
      if (currentTab === 'trust')               return <TrustScoreView user={user} />;
      if (currentTab === 'verification')        return <VerificationDashboard user={user} />;
      if (currentTab === 'admin-subscriptions') return <AdminSubscriptionManager user={user} />;
      return <AdminDashboard />;
    }

    if (user.role === 'Investor') {
      if (currentTab === 'subscription') return <SubscriptionPlans user={user} />;
      if (currentTab === 'trust')        return <TrustScoreView user={user} />;
      if (currentTab === 'ai-assistant') return <PremiumAIChat user={user} userRole="Investor" setCurrentTab={setCurrentTab} />;
      if (currentTab === 'consultations') return <ConsultationHub user={user} userRole="Investor" setCurrentTab={setCurrentTab} />;
      return (
        <InvestorDashboard
          setCurrentTab={setCurrentTab}
          setDiscussionId={setDiscussionId}
        />
      );
    }

    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Role panel not configured.</div>;
  };

  return (
    <div className="app-layout">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 35, display: 'none'
          }}
          className="sidebar-overlay"
        />
      )}

      <Sidebar
        user={user}
        currentTab={currentTab}
        setCurrentTab={(tab) => { setCurrentTab(tab); setSidebarOpen(false); }}
        sidebarOpen={sidebarOpen}
      />

      <div className="main-content">
        <Navbar
          user={user}
          currentTab={currentTab}
          handleLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          onMenuClick={() => setSidebarOpen(o => !o)}
        />
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
