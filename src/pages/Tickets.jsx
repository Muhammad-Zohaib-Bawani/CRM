import { useMemo, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import TicketModal from '../components/TicketModal.jsx';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function Tickets() {
  const { user } = useAuth();
  const { tickets, users, ticketTypes, updateTicketStatus } = useData();

  const [view, setView] = useState('kanban'); // kanban | list | card
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [modalMode, setModalMode] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);

  const canCreate = user.role === 'admin';
  const agents = users.filter((u) => u.role === 'agent');

  const scoped = useMemo(() => {
    if (user.role === 'admin') return tickets;
    return tickets.filter((t) => t.assignedTo === user.id);
  }, [tickets, user]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    return scoped.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
      if (showOnlyMine && t.assignedTo !== user.id) return false;
      if (fromTs || toTs) {
        const created = new Date(t.createdAt).getTime();
        if (fromTs && created < fromTs) return false;
        if (toTs && created > toTs) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.id.toLowerCase().includes(q) &&
          !(t.description || '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [scoped, filterStatus, filterPriority, filterType, filterAssignee, showOnlyMine, search, dateFrom, dateTo, user.id]);

  const openCreate = () => {
    setActiveTicket(null);
    setModalMode('create');
  };
  const openView = (t) => {
    setActiveTicket(t);
    setModalMode('view');
  };
  const closeModal = () => {
    setActiveTicket(null);
    setModalMode(null);
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Drag-and-drop
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const onDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };
  const onDragOver = (e, status) => {
    e.preventDefault();
    setDragOverCol(status);
  };
  const onDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const t = tickets.find((x) => x.id === id);
    if (!t || t.status === status) {
      setDragOverCol(null);
      return;
    }
    if (user.role === 'agent' && t.assignedTo !== user.id) {
      setDragOverCol(null);
      return;
    }
    updateTicketStatus(id, status);
    setDragOverCol(null);
  };

  const userById = (id) => users.find((u) => u.id === id);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const isOverdue = (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < new Date();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{user.role === 'admin' ? 'All Tickets' : 'My Tickets'}</h1>
          <div className="sub">
            {filtered.length} of {scoped.length} ticket{scoped.length === 1 ? '' : 's'}
            {user.role === 'agent' && ' assigned to you'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              <i className="fa-solid fa-list" /> List
            </button>
            <button className={view === 'card' ? 'active' : ''} onClick={() => setView('card')}>
              <i className="fa-solid fa-grip" /> Cards
            </button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
              <i className="fa-solid fa-columns" /> Kanban
            </button>
          </div>
          {canCreate && (
            <button className="btn btn-gold" onClick={openCreate}>
              <i className="fa-solid fa-plus" /> New Ticket
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <div className="search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by ID, title, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          {ticketTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {user.role === 'admin' && (
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="all">All agents</option>
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', borderLeft: '1px solid var(--line)' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Created
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: '#fafafa', fontSize: 12 }}
            title="From date"
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: '#fafafa', fontSize: 12 }}
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearDates}
              style={{ color: 'var(--muted)', fontSize: 12, padding: '4px 6px' }}
              title="Clear date filter"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <input
            type="checkbox"
            checked={showOnlyMine}
            onChange={(e) => setShowOnlyMine(e.target.checked)}
          />
          Only mine
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-folder-open" />
          <h3>No tickets match your filters</h3>
          <p>Try clearing a filter or {canCreate ? 'creating a new ticket' : 'check back later'}.</p>
        </div>
      ) : view === 'list' ? (
        <div className="ticket-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const a = userById(t.assignedTo);
                const overdue = isOverdue(t);
                return (
                  <tr key={t.id} onClick={() => openView(t)} style={{ cursor: 'pointer' }}>
                    <td className="ticket-id">{t.id}</td>
                    <td>
                      <div className="ticket-title">{t.title}</div>
                      {(t.attachments || []).length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          <i className="fa-solid fa-paperclip" /> {t.attachments.length} attachment{t.attachments.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>
                        {t.type}
                      </span>
                    </td>
                    <td><span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                    <td>{a ? a.name : <em style={{ color: 'var(--muted)' }}>Unassigned</em>}</td>
                    <td style={{ color: overdue ? '#b91c1c' : 'var(--muted)', fontSize: 12, fontWeight: overdue ? 600 : 400 }}>
                      {fmtDate(t.dueDate)}
                      {overdue && <i className="fa-solid fa-triangle-exclamation" style={{ marginLeft: 4 }} />}
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === 'card' ? (
        <div className="ticket-cards">
          {filtered.map((t) => {
            const a = userById(t.assignedTo);
            const overdue = isOverdue(t);
            return (
              <div key={t.id} className="ticket-card" onClick={() => openView(t)}>
                <div className="head">
                  <span className="tid">{t.id}</span>
                  <span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span>
                </div>
                <h3>{t.title}</h3>
                <p className="desc">{t.description || 'No description'}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>
                    {t.type}
                  </span>
                  {t.dueDate && (
                    <span
                      className="badge"
                      style={{
                        background: overdue ? '#fee2e2' : '#f3f4f6',
                        color: overdue ? '#b91c1c' : 'var(--muted)',
                      }}
                    >
                      <i className="fa-solid fa-calendar" /> {fmtDate(t.dueDate)}
                    </span>
                  )}
                  {(t.attachments || []).length > 0 && (
                    <span className="badge" style={{ background: '#f3f4f6', color: 'var(--muted)' }}>
                      <i className="fa-solid fa-paperclip" /> {t.attachments.length}
                    </span>
                  )}
                </div>
                <div className="meta">
                  <span className="assignee">
                    {a ? (
                      <>
                        <span className="mini-avatar">{a.initials}</span> {a.name}
                      </>
                    ) : (
                      <em>Unassigned</em>
                    )}
                  </span>
                  <span>{fmtDate(t.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kanban">
          {STATUSES.map((col) => {
            const items = filtered.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className={`kanban-col col-${col.key} ${dragOverCol === col.key ? 'drag-over' : ''}`}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <h3>
                  {col.label}
                  <span className="count">{items.length}</span>
                </h3>
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>
                    Drop tickets here
                  </div>
                )}
                {items.map((t) => {
                  const a = userById(t.assignedTo);
                  const overdue = isOverdue(t);
                  const canDrag = user.role === 'admin' || (user.role === 'agent' && t.assignedTo === user.id);
                  return (
                    <div
                      key={t.id}
                      className={`kanban-card ${draggingId === t.id ? 'dragging' : ''}`}
                      draggable={canDrag}
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => openView(t)}
                      style={{ cursor: canDrag ? 'grab' : 'pointer' }}
                    >
                      <div className="tid">{t.id}</div>
                      <div className="title">{t.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>
                          {t.type}
                        </span>
                      </div>
                      <div className="foot">
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {a ? (
                            <>
                              <span className="mini-avatar" style={{ display: 'inline-grid', verticalAlign: 'middle', marginRight: 4 }}>
                                {a.initials}
                              </span>
                              {a.name.split(' ')[0]}
                            </>
                          ) : (
                            'Unassigned'
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                          {t.dueDate && (
                            <span style={{ color: overdue ? '#b91c1c' : 'var(--muted)', fontWeight: overdue ? 600 : 400 }}>
                              <i className="fa-solid fa-calendar" /> {fmtDate(t.dueDate)}
                            </span>
                          )}
                          {t.comments.length > 0 && (
                            <span><i className="fa-regular fa-comment" /> {t.comments.length}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {modalMode && (
        <TicketModal mode={modalMode} ticket={activeTicket} onClose={closeModal} />
      )}
    </div>
  );
}
