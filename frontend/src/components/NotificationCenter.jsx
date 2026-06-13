import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { subscribeToNotifications } from '../services/signalr';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Hook SignalR
    const unsubscribe = subscribeToNotifications((notif) => {
      // Add new notification to top
      setNotifications(prev => [notif, ...prev]);
    });

    // Close dropdown on click outside
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button className="notification-bell" onClick={() => setShowDropdown(!showDropdown)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <span>In-App Notifications</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'normal' }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <ul className="notifications-list">
            {notifications.length === 0 ? (
              <li style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications yet.
              </li>
            ) : (
              notifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notif.id, notif.isRead)}
                >
                  <h5>{notif.title}</h5>
                  <p>{notif.message}</p>
                  <span>{timeAgo(notif.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
