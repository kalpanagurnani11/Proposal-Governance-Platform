import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SubmitterDashboard from './pages/SubmitterDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import { initSignalR, stopSignalR } from './services/signalr';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    // Check if user credentials exist in local storage (session persistence)
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsedUser);

      // Set initial role-based landing tab
      if (parsedUser.role === 'Admin') {
        setCurrentTab('admin');
      } else if (parsedUser.role === 'Reviewer') {
        setCurrentTab('reviews');
      } else {
        setCurrentTab('dashboard');
      }

      // Initialize real-time updates socket
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
      department: authData.department
    };

    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userProfile));

    setToken(authData.token);
    setUser(userProfile);

    // Navigate to default tab based on role
    if (userProfile.role === 'Admin') {
      setCurrentTab('admin');
    } else if (userProfile.role === 'Reviewer') {
      setCurrentTab('reviews');
    } else {
      setCurrentTab('dashboard');
    }

    // Start SignalR
    initSignalR(userProfile.id, userProfile.role);
  };

  const handleLogout = () => {
    localStorage.clear();
    stopSignalR();
    setToken(null);
    setUser(null);
    setIsRegistering(false);
    setCurrentTab('dashboard');
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

  // Dashboard content switching based on role & active tab
  const renderContent = () => {
    if (user.role === 'Submitter') {
      return (
        <SubmitterDashboard
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
        />
      );
    } else if (user.role === 'Reviewer') {
      return <ReviewerDashboard />;
    } else if (user.role === 'Admin') {
      if (currentTab === 'admin') {
        return <AdminDashboard />;
      } else if (currentTab === 'analytics') {
        return <AnalyticsDashboard />;
      }
    }
    return <div style={{ padding: '2rem' }}>Role panel not configured.</div>;
  };

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      <div className="main-content">
        <Navbar
          user={user}
          currentTab={currentTab}
          handleLogout={handleLogout}
        />
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
