import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminSubscriptionManager({ user }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Platform configuration state
  const [configs, setConfigs] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState(null);

  // Administrative action states
  const [actionTab, setActionTab] = useState('grant'); // grant, duration, status
  const [selectedPlanId, setSelectedPlanId] = useState('2'); // Founder Premium by default
  const [daysModifier, setDaysModifier] = useState('30');
  const [remarks, setRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Tabs for main view
  const [activeTab, setActiveTab] = useState('users'); // users, config

  // Curated lists
  const roles = ['All', 'Founder', 'Investor', 'Reviewer', 'Admin'];
  const plans = [
    { id: 1, name: 'Founder Basic', role: 'Founder' },
    { id: 2, name: 'Founder Premium', role: 'Founder' },
    { id: 3, name: 'Investor Basic', role: 'Investor' },
    { id: 4, name: 'Investor Premium', role: 'Investor' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchConfigs();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/subscriptions/users?search=${encodeURIComponent(search)}&role=${roleFilter}`);
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to load users list', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      const res = await api.get('/admin/subscriptions/config');
      setConfigs(res || []);
    } catch (err) {
      console.error('Failed to load platform config', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    setDetailLoading(true);
    setActionMessage(null);
    setRemarks('');
    try {
      const res = await api.get(`/admin/subscriptions/${userId}`);
      setSelectedUserDetail(res);
    } catch (err) {
      console.error('Failed to load user details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUserSelect = (u) => {
    setSelectedUser(u);
    fetchUserDetail(u.id);
  };

  const handleUpdateConfig = async (key, value) => {
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      await api.put('/admin/subscriptions/config', { key, value });
      await fetchConfigs();
      setConfigMessage({ type: 'success', text: `Configuration '${key}' updated successfully.` });
    } catch (err) {
      setConfigMessage({ type: 'error', text: err.message || 'Failed to update config.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAdminAction = async (actionType) => {
    if (!selectedUser) return;
    setSubmittingAction(true);
    setActionMessage(null);

    const payload = {
      userId: selectedUser.id,
      remarks: remarks.trim()
    };

    try {
      let endpoint = '';
      if (actionType === 'grant') {
        payload.subscriptionId = parseInt(selectedPlanId);
        endpoint = '/admin/subscriptions/change-plan'; // Calls change-plan (handles grant as well)
      } else if (actionType === 'revoke') {
        endpoint = '/admin/subscriptions/revoke';
      } else if (actionType === 'extend') {
        payload.days = parseInt(daysModifier);
        endpoint = '/admin/subscriptions/extend';
      } else if (actionType === 'shorten') {
        payload.days = parseInt(daysModifier);
        endpoint = '/admin/subscriptions/shorten';
      } else if (actionType === 'suspend') {
        endpoint = '/admin/subscriptions/suspend';
      } else if (actionType === 'reactivate') {
        endpoint = '/admin/subscriptions/reactivate';
      }

      const res = await api.post(endpoint, payload);
      setActionMessage({ type: 'success', text: res.message || 'Action executed successfully.' });
      setRemarks('');
      
      // Refresh details
      await fetchUserDetail(selectedUser.id);
      await fetchUsers();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Administrative action failed.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatPlanStatus = (sub) => {
    if (!sub) return 'None';
    return `${sub.planName || sub.PlanName} (${sub.status || sub.Status})`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active': return 'badge-approved';
      case 'Suspended': return 'badge-underreview';
      case 'Cancelled': return 'badge-draft';
      case 'Expired': return 'badge-rejected';
      default: return 'badge-draft';
    }
  };

  return (
    <div className="page-container">
      
      {/* Tab Selector */}
      <div className="page-header">
        <div>
          <h2>Admin Subscription Governance</h2>
          <p>Grant, revoke, modify terms of user subscriptions, and update AI/Consultation limits.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ margin: 0 }}
            onClick={() => setActiveTab('users')}
          >
            User Subscriptions
          </button>
          <button 
            className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ margin: 0 }}
            onClick={() => setActiveTab('config')}
          >
            Platform Configs
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <div className="table-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <h3>Global Platform Configurations</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {configMessage && (
              <div style={{ 
                background: configMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                border: `1px solid ${configMessage.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, 
                color: configMessage.type === 'success' ? 'var(--color-approved)' : 'var(--color-rejected)', 
                padding: '0.75rem 1rem', 
                borderRadius: '6px', 
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}>
                {configMessage.text}
              </div>
            )}

            {configLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading settings...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {configs.map((cfg) => {
                  const key = cfg.key || cfg.Key;
                  const val = cfg.value || cfg.Value;
                  const desc = cfg.description || cfg.Description;
                  
                  const isToggle = val === 'true' || val === 'false';

                  return (
                    <div 
                      key={key} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        paddingBottom: '1.25rem', 
                        borderBottom: '1px solid var(--border-color)' 
                      }}
                    >
                      <div style={{ maxWidth: '70%' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{key}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</p>
                      </div>
                      
                      <div>
                        {isToggle ? (
                          <button
                            className={`btn ${val === 'true' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleUpdateConfig(key, val === 'true' ? 'false' : 'true')}
                            disabled={savingConfig}
                            style={{ margin: 0, padding: '0.4rem 1.25rem', fontSize: '0.8rem' }}
                          >
                            {val === 'true' ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <input
                              type="number"
                              className="form-input"
                              defaultValue={val}
                              onBlur={(e) => {
                                if (e.target.value !== val && e.target.value !== '') {
                                  handleUpdateConfig(key, e.target.value);
                                }
                              }}
                              style={{ width: '80px', textAlign: 'center', height: '32px', padding: '0', margin: 0 }}
                              disabled={savingConfig}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Users Split Grid */
        <div className="dashboard-columns">
          
          {/* Left Panel: Search & User Table */}
          <div>
            <div className="table-card" style={{ height: '100%' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search username, email or fullname..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, margin: 0, height: '36px' }}
                  />
                </div>
                
                {/* Role Tabs */}
                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                  {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      style={{
                        margin: 0,
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.72rem',
                        borderRadius: '20px',
                        background: roleFilter === r ? 'var(--accent-primary-light)' : 'transparent',
                        color: roleFilter === r ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: roleFilter === r ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        fontWeight: roleFilter === r ? '700' : '500',
                        cursor: 'pointer'
                      }}
                    >
                      {r}s
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>Loading user directory...</div>
              ) : users.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No users found matching requirements.
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                  <table className="governance-table" style={{ border: 'none' }}>
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '1rem' }}>User</th>
                        <th>Role</th>
                        <th>Subscription Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isSelected = selectedUser && selectedUser.id === u.id;
                        const sub = u.subscription || u.Subscription;
                        return (
                          <tr 
                            key={u.id} 
                            onClick={() => handleUserSelect(u)}
                            style={{ 
                              cursor: 'pointer',
                              background: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            <td style={{ paddingLeft: '1rem' }}>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{u.fullName || u.Username}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {u.role || u.Role}
                              </span>
                            </td>
                            <td>
                              {sub ? (
                                <span className={`badge ${getStatusBadge(sub.status || sub.Status)}`} style={{ fontSize: '0.72rem' }}>
                                  {sub.planName || sub.PlanName}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Free/None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Subscription Controller */}
          <div>
            {selectedUser ? (
              <div className="detail-card">
                
                {/* Detail Header */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedUser.fullName || selectedUser.username}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Email: {selectedUser.email} | Role: <b>{selectedUser.role}</b>
                  </span>
                </div>

                {detailLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}>Loading details...</div>
                ) : selectedUserDetail ? (
                  <div>
                    
                    {/* Active Plan Stats */}
                    <div style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      padding: '0.85rem 1rem', 
                      marginBottom: '1.25rem' 
                    }}>
                      <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Current Active Subscription
                      </h4>
                      {selectedUserDetail.subscriptions && selectedUserDetail.subscriptions.filter(s => s.status === 'Active' || s.Status === 'Active').length > 0 ? (
                        (() => {
                          const active = selectedUserDetail.subscriptions.find(s => s.status === 'Active' || s.Status === 'Active');
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Plan: </span>
                                <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{active.subscription?.name || active.Subscription?.Name || 'Premium'}</span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Status: </span>
                                <span className={`badge ${getStatusBadge(active.status || active.Status)}`}>{active.status || active.Status}</span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>End Date: </span>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>
                                  {active.endDate.includes('9999') ? 'Lifetime' : new Date(active.endDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Consultations Remaining: </span>
                                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                                  {active.remainingReviewerConsultations}/{active.totalReviewerConsultations}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          No active premium subscription. Standard free limits apply.
                        </p>
                      )}
                    </div>

                    {/* Operational Message */}
                    {actionMessage && (
                      <div style={{ 
                        background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                        border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, 
                        color: actionMessage.type === 'success' ? 'var(--color-approved)' : 'var(--color-rejected)', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '6px', 
                        marginBottom: '1rem',
                        fontSize: '0.8rem'
                      }}>
                        {actionMessage.text}
                      </div>
                    )}

                    {/* Admin Action Box */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                      
                      {/* Action Selector tabs */}
                      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                        <button 
                          className="btn" 
                          onClick={() => setActionTab('grant')}
                          style={{
                            margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: 'none', border: 'none', borderRadius: 0,
                            borderBottom: actionTab === 'grant' ? '2px solid var(--accent-primary)' : 'none',
                            color: actionTab === 'grant' ? 'var(--accent-primary)' : 'var(--text-muted)'
                          }}
                        >
                          Grant/Change
                        </button>
                        <button 
                          className="btn" 
                          onClick={() => setActionTab('duration')}
                          style={{
                            margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: 'none', border: 'none', borderRadius: 0,
                            borderBottom: actionTab === 'duration' ? '2px solid var(--accent-primary)' : 'none',
                            color: actionTab === 'duration' ? 'var(--accent-primary)' : 'var(--text-muted)'
                          }}
                        >
                          Modify Days
                        </button>
                        <button 
                          className="btn" 
                          onClick={() => setActionTab('status')}
                          style={{
                            margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: 'none', border: 'none', borderRadius: 0,
                            borderBottom: actionTab === 'status' ? '2px solid var(--accent-primary)' : 'none',
                            color: actionTab === 'grant' ? 'var(--accent-primary)' : 'var(--text-muted)'
                          }}
                        >
                          Status Toggles
                        </button>
                      </div>

                      {/* Remarks Input */}
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Admin Change Remarks *</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Granted promotional license / suspension request" 
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          style={{ height: '32px', fontSize: '0.8rem' }}
                        />
                      </div>

                      {actionTab === 'grant' && (
                        <div>
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Select Plan Tier</label>
                            <select 
                              className="form-input"
                              value={selectedPlanId}
                              onChange={(e) => setSelectedPlanId(e.target.value)}
                              style={{ height: '34px', fontSize: '0.8rem', padding: '0 0.5rem' }}
                            >
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                              ))}
                            </select>
                          </div>
                          <button 
                            className="btn btn-primary btn-full"
                            onClick={() => handleAdminAction('grant')}
                            disabled={submittingAction || !remarks.trim()}
                            style={{ margin: 0, padding: '0.4rem', fontSize: '0.825rem' }}
                          >
                            Grant / Alter User Plan
                          </button>
                        </div>
                      )}

                      {actionTab === 'duration' && (
                        <div>
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Amount of Days</label>
                            <input 
                              type="number" 
                              className="form-input" 
                              value={daysModifier} 
                              onChange={(e) => setDaysModifier(e.target.value)}
                              style={{ height: '34px', fontSize: '0.8rem' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleAdminAction('extend')}
                              disabled={submittingAction || !remarks.trim()}
                              style={{ margin: 0, padding: '0.4rem', fontSize: '0.825rem' }}
                            >
                              Extend Days
                            </button>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => handleAdminAction('shorten')}
                              disabled={submittingAction || !remarks.trim()}
                              style={{ margin: 0, padding: '0.4rem', fontSize: '0.825rem', borderColor: 'var(--color-rejected)', color: 'var(--color-rejected)' }}
                            >
                              Shorten Days
                            </button>
                          </div>
                        </div>
                      )}

                      {actionTab === 'status' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleAdminAction('suspend')}
                            disabled={submittingAction || !remarks.trim()}
                            style={{ flex: 1, margin: 0, padding: '0.4rem', fontSize: '0.8rem', borderColor: 'var(--color-underreview)', color: 'var(--color-underreview)' }}
                          >
                            Suspend Sub
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleAdminAction('reactivate')}
                            disabled={submittingAction || !remarks.trim()}
                            style={{ flex: 1, margin: 0, padding: '0.4rem', fontSize: '0.8rem' }}
                          >
                            Reactivate
                          </button>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleAdminAction('revoke')}
                            disabled={submittingAction || !remarks.trim()}
                            style={{ flex: '1 1 100%', margin: '0.25rem 0 0 0', padding: '0.4rem', fontSize: '0.8rem', background: 'rgba(220,38,38,0.1)', color: 'var(--color-rejected)', borderColor: 'var(--color-rejected)' }}
                          >
                            Revoke License (Cancel)
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Subscription History Audit Log */}
                    <div>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        Subscription Audit Log ({selectedUserDetail.history?.length || 0})
                      </h4>
                      {selectedUserDetail.history && selectedUserDetail.history.length > 0 ? (
                        <div style={{ 
                          maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                          background: 'rgba(0,0,0,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.65rem'
                        }}>
                          {selectedUserDetail.history.map((h, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', borderBottom: i < selectedUserDetail.history.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                                <span>{h.action || h.Action}</span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                                  {new Date(h.createdAt || h.CreatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Plan: {h.oldPlan || h.OldPlan} ➔ {h.newPlan || h.NewPlan}
                              </div>
                              <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                Remarks: "{h.reason || h.Reason || 'None'}"
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Operator: {h.changedByAdminName || h.ChangedByAdminName}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No subscription transactions logged.
                        </p>
                      )}
                    </div>

                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Failed to retrieve data.</p>
                )}

              </div>
            ) : (
              <div className="detail-card text-center" style={{ padding: '6rem 2rem', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
                <h3>Select a User</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Select a user profile from the database list to inspect current plan stats, review full audit timeline events, or grant/alter membership packages.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
