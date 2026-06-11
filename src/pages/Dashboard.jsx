import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import DonutChart from '../components/DonutChart.jsx';
import TicketModal from '../components/TicketModal.jsx';
import { getDashboardStats } from '../services/dashboard.js';

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboardStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const now = new Date();

  const counts = useMemo(() => {
    if (!stats) return { total: 0, open: 0, progress: 0, completed: 0, resolved: 0, overdue: 0, notificationsToday: 0, activeForms: 0, totalAgents: 0 };
    return {
      total:              stats.total,
      open:               stats.open,
      progress:           stats.inProgress,
      completed:          stats.completed,
      resolved:           stats.resolved,
      overdue:            stats.overdue,
      notificationsToday: stats.notificationsToday,
      activeForms:        stats.activeForms,
      totalAgents:        stats.totalAgents,
    };
  }, [stats]);

  const chartData = [
    { label: 'Open',        value: counts.open,      color: 'var(--status-open)' },
    { label: 'In Progress', value: counts.progress,  color: 'var(--status-progress)' },
    { label: 'Completed',   value: counts.completed, color: 'var(--status-completed)' },
    { label: 'Resolved',    value: counts.resolved,  color: 'var(--status-resolved)' },
  ];

  const todayOpenTickets = stats?.todayOpenTickets ?? [];

  return (
    <div>
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>{isAdmin ? 'Administrator Dashboard' : 'Agent Dashboard'}</h1>
          <div className="sub">
            Welcome back, <strong>{user.name}</strong> ·{' '}
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Link to="/tickets" className="btn btn-primary">
          <i className="fa-solid fa-ticket" /> View Tickets
        </Link>
      </div>

      {ticketModalOpen && (
        <TicketModal
          mode="create"
          ticket={null}
          onClose={() => setTicketModalOpen(false)}
        />
      )}

      {loading ? (
        <DashboardSkeleton role={user.role} />
      ) : (
        <>
          {/* Row 1 — ticket stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <StatCard label="Total Tickets" value={counts.total}     icon="fa-ticket" />
            <StatCard label="Open"          value={counts.open}      icon="fa-folder-open"          variant="open" />
            <StatCard label="In Progress"   value={counts.progress}  icon="fa-spinner"              variant="progress" />
            <StatCard label="Completed"     value={counts.completed} icon="fa-circle-check"         variant="completed" />
            <StatCard label="Resolved"      value={counts.resolved}  icon="fa-check-double"         variant="resolved" />
            <StatCard label="Overdue"       value={counts.overdue}   icon="fa-triangle-exclamation" variant="overdue" />
          </div>

          {/* Row 2 — admin stats + quick actions */}
          {isAdmin && (
            <div className="stats-grid">
              <StatCard label="Notifications Sent (Daily)" value={counts.notificationsToday} icon="fa-paper-plane" />
              <StatCard label="Active Forms"               value={counts.activeForms}        icon="fa-clipboard-list" />
              <StatCard label="Total Agents"               value={counts.totalAgents}        icon="fa-headset" />
              <ActionCard label="Add Ticket"        icon="fa-plus"           onClick={() => setTicketModalOpen(true)} />
              <ActionCard label="Send Notification" icon="fa-paper-plane"    to="/notifications" />
              <ActionCard label="Build Form"        icon="fa-clipboard-list" to="/forms" />
            </div>
          )}

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
                  {todayOpenTickets.map((t) => (
                    <Link
                      to="/tickets"
                      key={t.id}
                      style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 4px', borderBottom: '1px solid var(--line)' }}
                    >
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-deep)', fontSize: 12 }}>
                        {t.ticketNumber}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--brand-soft)', color: 'var(--brand-deep)', borderRadius: 100, fontWeight: 600, letterSpacing: '0.04em' }}>
                            {t.type}
                          </span>
                          <span>{t.assignedToName ? `Assigned to ${t.assignedToName}` : 'Unassigned'}</span>
                        </div>
                      </div>
                      <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Status donut */}
            <div className="card">
              <h3 style={{ margin: '0 0 18px', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Status Completion
              </h3>
              <DonutChart data={chartData} centerLabel="Completed" />
            </div>
          </div>

          {/* Sources breakdown — admin only */}
          {isAdmin && stats?.sources?.length > 0 && (
            <SourcesCard sources={stats.sources} total={stats.total} />
          )}
        </>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Sk({ w = '100%', h = 14, r = 6, mb = 0 }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, display: 'block', marginBottom: mb }} />;
}

function DashboardSkeleton({ role }) {
  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="skeleton-stat-card" key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk w={88} h={11} />
              <Sk w={48} h={30} r={8} />
            </div>
            <Sk w={42} h={42} r="50%" />
          </div>
        ))}
      </div>

      {role === 'admin' && (
        <div className="stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton-stat-card" key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Sk w={88} h={11} />
                <Sk w={48} h={30} r={8} />
              </div>
              <Sk w={42} h={42} r="50%" />
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-split">
        <div className="skeleton-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Sk w={170} h={13} />
            <Sk w={30} h={22} r={100} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 58px', gap: 14, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--line)', opacity: 1 - i * 0.15 }}>
              <Sk h={13} r={4} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Sk h={13} w="80%" />
                <Sk h={11} w="48%" />
              </div>
              <Sk h={22} r={100} />
            </div>
          ))}
        </div>
        <div className="skeleton-card">
          <Sk w={150} h={13} mb={28} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Sk w={180} h={180} r="50%" />
            <div style={{ display: 'flex', gap: 18 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sk w={10} h={10} r="50%" />
                  <Sk w={60} h={11} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {role === 'admin' && (
        <div className="skeleton-card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Sk w={130} h={13} />
            <Sk w={60} h={22} r={100} />
          </div>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', justifyContent: 'space-around', height: 208, paddingBottom: 0 }}>
            {[100, 60, 85, 40, 70].map((h, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <Sk w={14} h={13} r={4} />
                <Sk w="60%" h={h} r="6px 6px 0 0" />
                <Sk w={48} h={11} r={4} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid var(--line)', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[72, 88, 64, 80].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sk w={10} h={10} r={3} />
                <Sk w={w} h={11} />
              </div>
            ))}
          </div>
        </div>
      )}
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
  if (to) return <Link to={to} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>{inner}</Link>;
  return <button onClick={onClick} className="stat-card" style={{ border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>{inner}</button>;
}

// ── SourcesCard ────────────────────────────────────────────────────────────

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#3b82f6'];

function SourcesCard({ sources, total }) {
  const maxCount = Math.max(...sources.map((s) => s.count), 1);
  const BAR_H = 160;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Ticket Sources
        </h3>
        <span style={{ fontSize: 12, color: 'var(--brand-deep)', background: 'var(--brand-soft)', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
          {total} total
        </span>
      </div>

      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', justifyContent: 'space-around', height: BAR_H + 48, paddingBottom: 0 }}>
        {sources.map((s, i) => {
          const pct = total ? Math.round((s.count / total) * 100) : 0;
          const barHeight = Math.max((s.count / maxCount) * BAR_H, 4);
          const color = PALETTE[i % PALETTE.length];
          return (
            <div key={s.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              {/* count label */}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{s.count}</span>
              {/* bar */}
              <div style={{ width: '60%', maxWidth: 48, height: barHeight, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease', position: 'relative' }}>
                {/* pct tooltip inside bar */}
                {barHeight > 28 && (
                  <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff', opacity: 0.9 }}>
                    {pct}%
                  </span>
                )}
              </div>
              {/* source label */}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>
                {s.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* x-axis baseline */}
      <div style={{ borderTop: '2px solid var(--line)', marginTop: 0 }} />

      {/* legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
        {sources.map((s, i) => {
          const pct = total ? Math.round((s.count / total) * 100) : 0;
          return (
            <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span>
              <span>{pct}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
