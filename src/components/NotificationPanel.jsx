import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getInboxNotifications,
  markAllRead,
  markRead,
  deleteInboxNotification,
} from '../services/inboxNotifications.js';

const TYPE_META = {
  ticket_assigned:      { icon: 'fa-user-tag',         color: '#1d4ed8', bg: '#dbeafe' },
  ticket_status_changed:{ icon: 'fa-arrows-rotate',    color: '#7c3aed', bg: '#ede9fe' },
  ticket_comment:       { icon: 'fa-comment',           color: '#0369a1', bg: '#e0f2fe' },
};

function typeIcon(type) {
  const m = TYPE_META[type];
  if (!m) return { icon: 'fa-bell', color: '#b88b56', bg: '#efe4d3' };
  return m;
}

function fmtRelative(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export default function NotificationPanel({ open, onClose, isAdmin, onCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    getInboxNotifications(1, 50)
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleItemClick = async (n) => {
    if (!n.read) {
      try {
        await markRead(n.id);
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
        onCountChange?.();
      } catch {}
    }
    if (n.redirectUrl) {
      onClose();
      navigate(n.redirectUrl);
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onCountChange?.();
    } catch {} finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteInboxNotification(id);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      onCountChange?.();
    } catch {}
  };

  return (
    <>
      <div className={`notif-panel-backdrop ${open ? 'open' : ''}`} aria-hidden="true" />

      <aside ref={panelRef} className={`notif-panel ${open ? 'open' : ''}`} role="dialog" aria-label="Notifications">
        {/* Header */}
        <div className="notif-panel-head">
          <div className="notif-panel-title">
            <i className="fa-regular fa-bell" />
            Notifications
            {unreadCount > 0 && (
              <span className="notif-panel-unread-pill">{unreadCount} unread</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                className="notif-panel-action-btn"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                title="Mark all as read"
              >
                <i className="fa-solid fa-check-double" />
              </button>
            )}
            <button className="notif-panel-close" onClick={onClose} title="Close">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="notif-panel-body">
          {loading ? (
            <div className="notif-panel-loading">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="notif-panel-skeleton">
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, width: '65%', marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: '90%', marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 11, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-panel-empty">
              <i className="fa-regular fa-bell-slash" />
              <p>You're all caught up</p>
              <span>No notifications yet</span>
            </div>
          ) : (
            notifications.map((n) => {
              const { icon, color, bg } = typeIcon(n.type);
              return (
                <div
                  key={n.id}
                  className={`notif-panel-item ${n.read ? 'read' : 'unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notif-panel-item-icon" style={{ background: bg, color }}>
                    <i className={`fa-solid ${icon}`} />
                  </div>
                  <div className="notif-panel-item-body">
                    <div className="notif-panel-item-head">
                      <span className="notif-panel-item-subject">{n.title}</span>
                      <span className="notif-panel-item-time">{fmtRelative(n.createdAt)}</span>
                    </div>
                    {n.message && (
                      <div className="notif-panel-item-preview">{n.message}</div>
                    )}
                  </div>
                  {!n.read && <span className="notif-unread-dot" title="Unread" />}
                  <button
                    className="notif-delete-btn"
                    title="Dismiss"
                    onClick={(e) => handleDelete(e, n.id)}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="notif-panel-footer">
            <Link to="/notification-history" className="btn-ghost-sm" onClick={onClose}>
              <i className="fa-solid fa-clock-rotate-left" /> History
            </Link>
            <Link to="/notifications" className="btn-gold-sm" onClick={onClose}>
              <i className="fa-solid fa-paper-plane" /> Compose
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
