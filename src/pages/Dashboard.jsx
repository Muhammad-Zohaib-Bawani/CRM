import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import DonutChart from '../components/DonutChart.jsx';
import TicketModal from '../components/TicketModal.jsx';
import { fetchCoreData } from '../services/data.js';

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { users, loadUsers, loadAgents } = useData();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCoreData()
      .then(({ tickets, notifications, forms }) => {
        if (cancelled) return;
        setTickets(tickets);
        setNotifications(notifications);
        setForms(forms);
      })
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (isAdmin) { loadUsers(); loadAgents(); } }, [isAdmin, loadUsers, loadAgents]);

  const now = new Date();

  const scopedTickets = useMemo(
    () => isAdmin ? tickets : tickets.filter((t) => t.assignedTo === user.id),
    [tickets, user, isAdmin],
  );

  const counts = useMemo(() => {
    const base = {
      total:     scopedTickets.length,
      open:      scopedTickets.filter((t) => t.status === 'open').length,
      progress:  scopedTickets.filter((t) => t.status === 'progress').length,
      completed: scopedTickets.filter((t) => t.status === 'completed').length,
      overdue:   scopedTickets.filter(
        (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < now,
      ).length,
    };
    if (!isAdmin) return base;
    return {
      ...base,
      notificationsToday: notifications.filter((n) => isSameDay(new Date(n.sentAt), now)).length,
      activeForms: forms.length,
      totalAgents: users.filter((u) => u.role === 'agent').length,
    };
  }, [scopedTickets, isAdmin, notifications, forms, users]);

  const todayOpenTickets = useMemo(
    () => scopedTickets.filter((t) => t.status === 'open' && isSameDay(new Date(t.createdAt), now)),
    [scopedTickets]
  );

  const chartData = [
    { label: 'Open',       value: counts.open,      color: 'var(--status-open)' },
    { label: 'In Progress', value: counts.progress,  color: 'var(--status-progress)' },
    { label: 'Completed',  value: counts.completed,  color: 'var(--status-completed)' },
  ];

  const userById = (id) => users.find((u) => u.id === id) || (id === user.id ? user : null);

  return (
    <div>
      {/* Header — always visible */}
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

      {/* ── Skeleton while loading ── */}
      {ticketModalOpen && (
        <TicketModal
          mode="create"
          ticket={null}
          onClose={(created) => {
            if (created) setTickets((prev) => [created, ...prev]);
            setTicketModalOpen(false);
          }}
        />
      )}

      {loading ? (
        <DashboardSkeleton role={user.role} />
      ) : (
        <>
          {/* Stat cards */}
          <div className="stats-grid">
            <StatCard label="Total Tickets" value={counts.total}     icon="fa-ticket" />
            <StatCard label="Open"          value={counts.open}      icon="fa-folder-open"          variant="open" />
            <StatCard label="In Progress"   value={counts.progress}  icon="fa-spinner"              variant="progress" />
            <StatCard label="Completed"     value={counts.completed} icon="fa-circle-check"         variant="completed" />
            <StatCard label="Overdue"       value={counts.overdue}   icon="fa-triangle-exclamation" variant="overdue" />
            {isAdmin && (
              <>
                <StatCard label="Notifications Sent (Daily)" value={counts.notificationsToday} icon="fa-paper-plane" />
                <StatCard label="Active Forms"               value={counts.activeForms}        icon="fa-clipboard-list" />
                <StatCard label="Total Agents"               value={counts.totalAgents}        icon="fa-headset" />
                <ActionCard label="Add Ticket"        icon="fa-plus"           onClick={() => setTicketModalOpen(true)} />
                <ActionCard label="Send Notification" icon="fa-paper-plane"    to="/notifications" />
                <ActionCard label="Build Form"        icon="fa-clipboard-list" to="/forms" />
              </>
            )}
          </div>

          {/* Split section */}
          <div className="dashboard-split">
            {/* Today's open tickets */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Today's Open Tickets
                </h3>
                <span style={{ fontSize: 12, color: 'var(--brand-deep)', background: 'var(--brand-soft)', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
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
                        style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 4px', borderBottom: '1px solid var(--line)' }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-deep)', fontSize: 12 }}>
                          {t.ticketNumber || t.id}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--brand-soft)', color: 'var(--brand-deep)', borderRadius: 100, fontWeight: 600, letterSpacing: '0.04em' }}>
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

            {/* Status donut + quick actions */}
            <div className="card">
              <h3 style={{ margin: '0 0 18px', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Status Completion
              </h3>
              <DonutChart data={chartData} centerLabel="Completed" />

            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Skeleton primitives ────────────────────────────────────────────────────

function Sk({ w = '100%', h = 14, r = 6, mb = 0 }) {
  return (
    <span
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r, display: 'block', marginBottom: mb }}
    />
  );
}

function DashboardSkeleton({ role }) {
  return (
    <>
      {/* stat card skeletons */}
      <div className="stats-grid">
        {Array.from({ length: role === 'admin' ? 11 : 5 }).map((_, i) => (
          <div className="skeleton-stat-card" key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk w={88} h={11} />
              <Sk w={48} h={30} r={8} />
            </div>
            <Sk w={42} h={42} r="50%" />
          </div>
        ))}
      </div>

      <div className="dashboard-split">
        {/* Today's tickets skeleton */}
        <div className="skeleton-card">
          {/* Card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Sk w={170} h={13} />
            <Sk w={30} h={22} r={100} />
          </div>

          {/* 5 ticket row skeletons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 58px',
                gap: 14,
                alignItems: 'center',
                padding: '13px 0',
                borderBottom: '1px solid var(--line)',
                opacity: 1 - i * 0.15,
              }}
            >
              <Sk h={13} r={4} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Sk h={13} w="80%" />
                <Sk h={11} w="48%" />
              </div>
              <Sk h={22} r={100} />
            </div>
          ))}
        </div>

        {/* Donut + quick actions skeleton */}
        <div className="skeleton-card">
          <Sk w={150} h={13} mb={28} />

          {/* Donut circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Sk w={180} h={180} r="50%" />
            <div style={{ display: 'flex', gap: 18 }}>
              {['Open', 'In Progress', 'Completed'].map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sk w={10} h={10} r="50%" />
                  <Sk w={60} h={11} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────

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

// ── ActionCard ─────────────────────────────────────────────────────────────

function ActionCard({ label, icon, onClick, to }) {
  const inner = (
    <>
      <div>
        <div className="label">Quick Action</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: 'var(--brand-deep)' }}>{label}</div>
      </div>
      <div className="icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>
        <i className={`fa-solid ${icon}`} />
      </div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="stat-card" style={{ border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
      {inner}
    </button>
  );
}
