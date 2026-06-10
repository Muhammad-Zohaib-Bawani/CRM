import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications } from '../services/notifications.js';

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function getTodayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const JOB_STATUS_META = {
  Queued:          { label: 'Queued',           color: '#92400e', bg: '#fef3c7', icon: 'fa-clock' },
  Processing:      { label: 'Sending…',         color: '#1e40af', bg: '#dbeafe', icon: 'fa-circle-notch fa-spin' },
  Completed:       { label: 'Delivered',        color: '#065f46', bg: '#d1fae5', icon: 'fa-circle-check' },
  PartiallyFailed: { label: 'Partial Failure',  color: '#92400e', bg: '#ffedd5', icon: 'fa-triangle-exclamation' },
  Failed:          { label: 'Failed',           color: '#991b1b', bg: '#fee2e2', icon: 'fa-circle-xmark' },
};

function JobStatusBadge({ status }) {
  const meta = JOB_STATUS_META[status] || JOB_STATUS_META.Queued;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: meta.color, background: meta.bg,
    }}>
      <i className={`fa-solid ${meta.icon}`} style={{ fontSize: 10 }} />
      {meta.label}
    </span>
  );
}

function DeliveryCount({ recipients }) {
  if (!recipients?.length) return null;
  const sent   = recipients.filter(r => r.status === 'Sent').length;
  const failed = recipients.filter(r => r.status === 'Failed').length;
  const total  = recipients.length;
  return (
    <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#059669', fontWeight: 600 }}>
        <i className="fa-solid fa-check" style={{ marginRight: 3 }} />{sent}
      </span>
      {failed > 0 && (
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          <i className="fa-solid fa-xmark" style={{ marginRight: 3 }} />{failed}
        </span>
      )}
      <span style={{ color: 'var(--muted)' }}>/ {total}</span>
    </span>
  );
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab]       = useState('recent');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    getNotifications(1, 200).then(setNotifications).catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-poll while any job is still active
  const hasActiveJobs = notifications.some(
    n => n.jobStatus === 'Queued' || n.jobStatus === 'Processing'
  );
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [hasActiveJobs, load]);

  const todayTs = getTodayMidnight();

  const recentNotifs = useMemo(
    () => notifications.filter((n) => {
      const d = new Date(n.sentAt || n.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayTs;
    }),
    [notifications, todayTs]
  );

  const previousNotifs = useMemo(
    () => notifications.filter((n) => {
      const d = new Date(n.sentAt || n.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < todayTs;
    }),
    [notifications, todayTs]
  );

  const baseList = tab === 'recent' ? recentNotifs : previousNotifs;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(
      (n) => n.subject.toLowerCase().includes(q) || stripHtml(n.body).toLowerCase().includes(q)
    );
  }, [baseList, search]);

  const grouped = useMemo(() => {
    const groups = new Map();
    filtered.forEach((n) => {
      const key = new Date(n.sentAt || n.createdAt).toISOString().slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalRecipients = filtered.reduce((s, n) => s + (n.recipientCount || 0), 0);
  const lastSent = filtered.length > 0 ? new Date(filtered[0].sentAt || filtered[0].createdAt) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notification History</h1>
          <div className="sub">
            <strong style={{ color: 'var(--brand-deep)' }}>{notifications.length}</strong> total broadcast{notifications.length === 1 ? '' : 's'} sent
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasActiveJobs && (
            <span style={{ fontSize: 12, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-circle-notch fa-spin" />
              Jobs running — refreshing…
            </span>
          )}
          <Link to="/notifications" className="btn btn-primary">
            <i className="fa-solid fa-paper-plane" /> Compose
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-history-tabs">
        <button
          className={`notif-tab ${tab === 'recent' ? 'active' : ''}`}
          onClick={() => { setTab('recent'); setSearch(''); }}
        >
          <i className="fa-solid fa-clock" />
          Recent Notifications
          <span className="notif-tab-count">{recentNotifs.length}</span>
        </button>
        <button
          className={`notif-tab ${tab === 'previous' ? 'active' : ''}`}
          onClick={() => { setTab('previous'); setSearch(''); }}
        >
          <i className="fa-solid fa-calendar-days" />
          Previous Notifications
          <span className="notif-tab-count">{previousNotifs.length}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="history-summary" style={{ marginBottom: 20, marginTop: 20 }}>
        <div className="summary-card">
          <div>
            <div className="lbl">{tab === 'recent' ? "Today's Broadcasts" : 'Past Broadcasts'}</div>
            <div className="val">{filtered.length}</div>
          </div>
          <div className="icon"><i className="fa-solid fa-paper-plane" /></div>
        </div>
        <div className="summary-card">
          <div>
            <div className="lbl">Total Recipients</div>
            <div className="val">{totalRecipients}</div>
          </div>
          <div className="icon"><i className="fa-solid fa-users" /></div>
        </div>
        <div className="summary-card">
          <div>
            <div className="lbl">Last Sent</div>
            <div className="val" style={{ fontSize: 16 }}>
              {lastSent ? lastSent.toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="icon"><i className="fa-solid fa-clock" /></div>
        </div>
      </div>

      {/* Search */}
      <div className="history-filter-bar" style={{ marginBottom: 20 }}>
        <div className="search" style={{ flex: 1 }}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search subject or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <i className="fa-solid fa-paper-plane" />
          <h3>
            {tab === 'recent'
              ? 'No notifications sent today'
              : search
              ? 'No matching broadcasts'
              : 'No previous notifications'}
          </h3>
          <p>
            {tab === 'recent'
              ? 'Broadcasts sent today will appear here.'
              : search
              ? 'Try clearing the search.'
              : 'All past broadcasts will appear here once sent.'}
          </p>
        </div>
      ) : (
        <div className="history-groups">
          {grouped.map(([date, items]) => {
            const d = new Date(date + 'T00:00:00');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            let dayLabel;
            if (d.getTime() === today.getTime())          dayLabel = 'Today';
            else if (d.getTime() === yesterday.getTime()) dayLabel = 'Yesterday';
            else dayLabel = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            return (
              <div className="history-day-group" key={date}>
                <div className="history-day-head">
                  <span className="day-label">{dayLabel}</span>
                  <span className="day-count">{items.length} email{items.length === 1 ? '' : 's'}</span>
                </div>
                {items.map((n) => {
                  const dateObj = new Date(n.sentAt || n.createdAt);
                  const preview = stripHtml(n.body);
                  const sentCount   = n.recipients?.filter(r => r.status === 'Sent').length   ?? 0;
                  const failedCount = n.recipients?.filter(r => r.status === 'Failed').length  ?? 0;
                  return (
                    <div key={n.id} className="history-row">
                      <div className="history-row-icon">
                        <i className="fa-solid fa-envelope" />
                      </div>
                      <div className="history-row-body">
                        <div className="history-row-head">
                          <strong>{n.subject}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <JobStatusBadge status={n.jobStatus} />
                            <span className="time">
                              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="history-row-meta">
                          <span>
                            <i className="fa-solid fa-users" /> {n.recipientCount} recipient{n.recipientCount === 1 ? '' : 's'}
                          </span>
                          {(n.jobStatus === 'Completed' || n.jobStatus === 'PartiallyFailed' || n.jobStatus === 'Failed') && (
                            <DeliveryCount recipients={n.recipients} />
                          )}
                          {n.attachments?.length > 0 && (
                            <span><i className="fa-solid fa-paperclip" /> {n.attachments.length}</span>
                          )}
                        </div>
                        {n.jobError && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                            {n.jobError}
                          </div>
                        )}
                        <div className="history-row-preview">
                          {preview.length > 200 ? preview.slice(0, 200) + '…' : preview}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
