import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../store/DataContext.jsx';

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

export default function NotificationHistory() {
  const { notifications } = useData();
  const [tab, setTab] = useState('recent');
  const [search, setSearch] = useState('');

  const todayTs = getTodayMidnight();

  const recentNotifs = useMemo(
    () =>
      notifications.filter((n) => {
        const d = new Date(n.sentAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === todayTs;
      }),
    [notifications, todayTs]
  );

  const previousNotifs = useMemo(
    () =>
      notifications.filter((n) => {
        const d = new Date(n.sentAt);
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
      (n) =>
        n.subject.toLowerCase().includes(q) ||
        stripHtml(n.body).toLowerCase().includes(q)
    );
  }, [baseList, search]);

  const grouped = useMemo(() => {
    const groups = new Map();
    filtered.forEach((n) => {
      const key = new Date(n.sentAt).toISOString().slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalRecipients = filtered.reduce((s, n) => s + (n.recipientCount || 0), 0);
  const lastSent = filtered.length > 0 ? new Date(filtered[0].sentAt) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notification History</h1>
          <div className="sub">
            <strong style={{ color: 'var(--brand-deep)' }}>{notifications.length}</strong> total broadcast{notifications.length === 1 ? '' : 's'} sent
          </div>
        </div>
        <Link to="/notifications" className="btn btn-primary">
          <i className="fa-solid fa-paper-plane" /> Compose
        </Link>
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
      <div className="history-summary" style={{ marginBottom: 20 , marginTop: 20}}>
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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            let dayLabel;
            if (d.getTime() === today.getTime()) dayLabel = 'Today';
            else if (d.getTime() === yesterday.getTime()) dayLabel = 'Yesterday';
            else
              dayLabel = d.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

            return (
              <div className="history-day-group" key={date}>
                <div className="history-day-head">
                  <span className="day-label">{dayLabel}</span>
                  <span className="day-count">
                    {items.length} email{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                {items.map((n) => {
                  const sentDate = new Date(n.sentAt);
                  const preview = stripHtml(n.body);
                  return (
                    <div key={n.id} className="history-row">
                      <div className="history-row-icon">
                        <i className="fa-solid fa-envelope" />
                      </div>
                      <div className="history-row-body">
                        <div className="history-row-head">
                          <strong>{n.subject}</strong>
                          <span className="time">
                            {sentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="history-row-meta">
                          <span>
                            <i className="fa-solid fa-users" /> {n.recipientCount} recipient
                            {n.recipientCount === 1 ? '' : 's'}
                          </span>
                          {n.attachments?.length > 0 && (
                            <span>
                              <i className="fa-solid fa-paperclip" /> {n.attachments.length}
                            </span>
                          )}
                        </div>
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
