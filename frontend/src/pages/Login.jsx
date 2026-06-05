import { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess, switchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post('/auth/login', { username, password });
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed. Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>CAPITAL GOVERNANCE</h1>
          <p>Sign in to access the analysis platform</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            color: 'var(--color-rejected)',
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username (e.g. admin)"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full mb-1" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <a onClick={switchToRegister} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }}>
            Register here
          </a>
        </div>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.25rem' }}>Demo Credentials:</span>
          <span style={{ display: 'block' }}>• <strong>Admin:</strong> admin / admin123</span>
          <span style={{ display: 'block' }}>• <strong>Reviewer:</strong> reviewer1 / reviewer123</span>
          <span style={{ display: 'block' }}>• <strong>Submitter:</strong> submitter1 / submitter123</span>
        </div>
      </div>
    </div>
  );
}
