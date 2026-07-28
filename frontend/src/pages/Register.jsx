import { useState } from 'react';
import { api } from '../services/api';

export default function Register({ onRegisterSuccess, switchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Founder');
  const [department, setDepartment] = useState('Engineering');
  const [patentId, setPatentId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName || !email) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', {
        username,
        password,
        fullName,
        email,
        role,
        department,
        patentId: role === 'Founder' ? patentId : null
      });
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        onRegisterSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Choose another username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>CREATE ACCOUNT</h1>
          <p>Register as Founder, Reviewer, Investor or Administrator</p>
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

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '6px',
            color: 'var(--color-approved)',
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Jenkins"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sjenkins@governance.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sjenkins"
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
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="role">Platform Role</label>
              <select
                id="role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Founder">Founder</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Investor">Investor</option>
                <option value="Admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Engineering">Engineering</option>
                <option value="R&D">R&D</option>
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          {role === 'Founder' && (
            <div className="form-group mb-3">
              <label htmlFor="patentId">Patent ID <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span></label>
              <input
                type="text"
                id="patentId"
                className="form-input"
                value={patentId}
                onChange={(e) => setPatentId(e.target.value)}
                placeholder="e.g. US10123456 or IN202111023456"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.2' }}>
                💡 Linking a valid patent ID grants you a <b>Verified Inventor</b> badge, adding institutional trust to your submissions.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full mb-1" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <a onClick={switchToLogin} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }}>
            Sign In here
          </a>
        </div>
      </div>
    </div>
  );
}
