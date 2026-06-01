import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import DonutChart from '../components/DonutChart.jsx';

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function Dashboard() {
  const { user } = useAuth();
  const { tickets, notifications, forms, users } = useData();

  const scopedTickets = useMemo(() => {
    if (user.role === 'admin') return tickets;
    return tickets.filter((t) => t.assignedTo === user.id);
  }, [tickets, user]);

  const now = new Date();

  const counts = useMemo(() => ({
    total: scopedTickets.length,
    open: scopedTickets.filter((t) => t.status === 'open').length,
    progress: scopedTickets.filter((t) => t.status === 'progress').length,
    completed: scopedTickets.filter((t) => t.status === 'completed').length,
    overdue: scopedTickets.filter(
      (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < now
    ).length,
    notificationsToday: notifications.filter((n) => isSameDay(new Date(n.sentAt), now)).length,
    activeForms: forms.length,
    totalAgents: users.filter((u) => u.role === 'agent').length,
  }), [scopedTickets, notifications, forms, users]);

  const todayOpenTickets = useMemo(
    () =>
      scopedTickets.filter(
        (t) => t.status === 'open' && isSameDay(new Date(t.createdAt), now)
      ),
    [scopedTickets]
  );

  const chartData = [
    { label: 'Open', value: counts.open, color: 'var(--status-open)' },
    { label: 'In Progress', value: counts.progress, color: 'var(--status-progress)' },
    { label: 'Completed', value: counts.completed, color: 'var(--status-completed)' },
  ];

  const userById = (id) => users.find((u) => u.id === id);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{user.role === 'admin' ? 'Administrator Dashboard' : 'Agent Dashboard'}</h1>
          <div className="sub">
            Welcome back, <strong>{user.name}</strong> ·{' '}
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Link to="/tickets" className="btn btn-primary">
          <i className="fa-solid fa-ticket" /> View Tickets
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Tickets" value={counts.total} icon="fa-ticket" />
        <StatCard label="Open" value={counts.open} icon="fa-folder-open" variant="open" />
        <StatCard label="In Progress" value={counts.progress} icon="fa-spinner" variant="progress" />
        <StatCard label="Completed" value={counts.completed} icon="fa-circle-check" variant="completed" />
        <StatCard label="Overdue" value={counts.overdue} icon="fa-triangle-exclamation" variant="overdue" />
        <StatCard label="Notifications Sent (Daily)" value={counts.notificationsToday} icon="fa-paper-plane" />
        <StatCard label="Active Forms" value={counts.activeForms} icon="fa-clipboard-list" />
        <StatCard label="Total Agents" value={counts.totalAgents} icon="fa-headset" />
      </div>

      <div className="dashboard-split">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Today's Open Tickets
            </h3>
            <span
              style={{
                fontSize: 12,
                color: 'var(--brand-deep)',
                background: 'var(--brand-soft)',
                padding: '3px 10px',
                borderRadius: 100,
                fontWeight: 600,
              }}
            >
              {todayOpenTickets.length}
            </span>
          </div>

          {todayOpenTickets.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <i className="fa-solid fa-mug-hot" />
              <h3>All caught up</h3>
              <p>No open tickets were created today.</p>
            </div>
          ) : (
            <div>
              {todayOpenTickets.map((t) => {
                const assignee = userById(t.assignedTo);
                return (
                  <Link
                    to="/tickets"
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      padding: '14px 4px',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-deep)', fontSize: 12 }}>
                      {t.id}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            background: 'var(--brand-soft)',
                            color: 'var(--brand-deep)',
                            borderRadius: 100,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {t.type}
                        </span>
                        <span>{assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}</span>
                      </div>
                    </div>
                    <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 18px', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Status Completion
          </h3>
          <DonutChart data={chartData} centerLabel="Completed" />

          {user.role === 'admin' && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Quick actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/tickets" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-plus" /> Create new ticket
                </Link>
                <Link to="/notifications" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-paper-plane" /> Send notification
                </Link>
                <Link to="/forms" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-clipboard-list" /> Build form
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, variant }) {
  return (
    <div className={`stat-card ${variant ? `stat-${variant}` : ''}`}>
      <div>
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
      <div className="icon"><i className={`fa-solid ${icon}`} /></div>
    </div>
  );
}
