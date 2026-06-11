import { useMemo, useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import { getTickets, getTicketById } from '../services/tickets.js';
import { fetchAgents } from '../services/data.js';
import TicketModal from '../components/TicketModal.jsx';
import { rsStylesCompact, findOption, toOptions } from '../utils/selectStyles.js';
import { STATUSES, STATUS_OPTS, PRIORITY_FILTER_OPTS, TYPE_META } from '../enums/tickets.js';

const IMG_EXT = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i;
function getFirstImgSrc(attachments) {
  for (const a of (attachments || [])) {
    if (a.preview) return a.preview;
    if (a.url && (a.type?.startsWith('image/') || IMG_EXT.test(a.url) || IMG_EXT.test(a.name || ''))) return a.url;
  }
  return null;
}

function TypePill({ type }) {
  const m = TYPE_META[type] || { icon: 'fa-tag', bg: 'var(--brand-soft)', color: 'var(--brand-deep)' };
  return (
    <span className="badge" style={{ background: m.bg, color: m.color }}>
      <i className={`fa-solid ${m.icon}`} style={{ marginRight: 4 }} />{type}
    </span>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  const { users, ticketTypes, updateTicketStatus, showToast, loadUsers } = useData();

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [agents, setAgents] = useState([]);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      setTickets(await getTickets({ pageSize: 200 }));
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    loadUsers();
    fetchAgents().then(setAgents).catch(console.error);
  }, [fetchTickets, loadUsers]);

  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const [modalMode, setModalMode] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);

  const canCreate = user.role === 'admin';

  const typeOpts = toOptions(ticketTypes, 'All types');
  const agentOpts = [
    { value: 'all', label: 'All agents' },
    { value: '', label: 'Unassigned' },
    ...agents.map((a) => ({ value: a.id, label: a.name })),
  ];

  const scoped = useMemo(() => {
    if (user.role === 'admin') return tickets;
    return tickets.filter((t) => t.assignedTo === user.id);
  }, [tickets, user]);

  const filtered = useMemo(() => {
    return scoped.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
      if (showOnlyMine && t.assignedTo !== user.id) return false;
      if (dateFrom) {
        const created = new Date(t.createdAt).getTime();
        if (created < dateFrom.setHours(0, 0, 0, 0)) return false;
      }
      if (dateTo) {
        const created = new Date(t.createdAt).getTime();
        if (created > new Date(dateTo).setHours(23, 59, 59, 999)) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !(t.ticketNumber || t.id).toLowerCase().includes(q) &&
          !(t.description || '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [scoped, filterStatus, filterPriority, filterType, filterAssignee, showOnlyMine, search, dateFrom, dateTo, user.id]);

  const openCreate = () => { setActiveTicket(null); setModalMode('create'); };
  const openView = (t) => { setActiveTicket(t); setModalMode('view'); };
  const closeModal = async (result) => {
    if (modalMode === 'create' && result) {
      setTickets((prev) => [result, ...prev]);
    } else if (modalMode === 'view' && activeTicket?.id) {
      try {
        const refreshed = await getTicketById(activeTicket.id);
        setTickets((prev) => prev.map((t) => t.id === refreshed.id ? refreshed : t));
      } catch {}
    }
    setActiveTicket(null);
    setModalMode(null);
  };
  const clearDates = () => { setDateFrom(null); setDateTo(null); };

  // Drag-and-drop
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const onDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
  const onDragOver = (e, status) => { e.preventDefault(); setDragOverCol(status); };
  const onDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const t = tickets.find((x) => x.id === id);
    if (!t || t.status === status) { setDragOverCol(null); return; }
    if (user.role === 'agent' && t.assignedTo !== user.id) { setDragOverCol(null); return; }
    const prevStatus = t.status;
    setTickets((prev) => prev.map((x) => x.id === id ? { ...x, status } : x));
    updateTicketStatus(id, status).catch(() => {
      setTickets((prev) => prev.map((x) => x.id === id ? { ...x, status: prevStatus } : x));
    });
    setDragOverCol(null);
  };

  const userById = (id) => users.find((u) => u.id === id) || (id === user.id ? user : null);
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

        <div style={{ minWidth: 148 }}>
          <Select
            options={STATUS_OPTS}
            value={findOption(STATUS_OPTS, filterStatus)}
            onChange={(opt) => setFilterStatus(opt?.value ?? 'all')}
            placeholder="All statuses"
            isClearable={filterStatus !== 'all'}
            styles={rsStylesCompact}
            menuPortalTarget={document.body}
          />
        </div>

        <div style={{ minWidth: 148 }}>
          <Select
            options={PRIORITY_FILTER_OPTS}
            value={findOption(PRIORITY_FILTER_OPTS, filterPriority)}
            onChange={(opt) => setFilterPriority(opt?.value ?? 'all')}
            placeholder="All priorities"
            isClearable={filterPriority !== 'all'}
            styles={rsStylesCompact}
            menuPortalTarget={document.body}
          />
        </div>

        <div style={{ minWidth: 130 }}>
          <Select
            options={typeOpts}
            value={findOption(typeOpts, filterType)}
            onChange={(opt) => setFilterType(opt?.value ?? 'all')}
            placeholder="All types"
            isClearable={filterType !== 'all'}
            styles={rsStylesCompact}
            menuPortalTarget={document.body}
          />
        </div>

        {user.role === 'admin' && (
          <div style={{ minWidth: 148 }}>
            <Select
              options={agentOpts}
              value={agentOpts.find((o) => o.value === filterAssignee) || null}
              onChange={(opt) => setFilterAssignee(opt?.value ?? 'all')}
              placeholder="All agents"
              isClearable={filterAssignee !== 'all'}
              styles={rsStylesCompact}
              menuPortalTarget={document.body}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', borderLeft: '1px solid var(--line)' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Created
          </span>
          <div className="dp-compact" style={{ width: 130 }}>
            <DatePicker
              selected={dateFrom}
              onChange={setDateFrom}
              selectsStart
              startDate={dateFrom}
              endDate={dateTo}
              dateFormat="dd MMM yyyy"
              placeholderText="From"
              isClearable
            />
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
          <div className="dp-compact" style={{ width: 130 }}>
            <DatePicker
              selected={dateTo}
              onChange={setDateTo}
              selectsEnd
              startDate={dateFrom}
              endDate={dateTo}
              minDate={dateFrom}
              dateFormat="dd MMM yyyy"
              placeholderText="To"
              isClearable
            />
          </div>
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
          <input type="checkbox" checked={showOnlyMine} onChange={(e) => setShowOnlyMine(e.target.checked)} />
          Only mine
        </label>
      </div>

      {loadingTickets ? (
        view === 'kanban' ? (
          <div className="kanban">
            {STATUSES.map((col) => (
              <div key={col.key} className={`kanban-col col-${col.key}`}>
                <h3>{col.label}<span className="count">—</span></h3>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(15,23,42,0.05)', borderLeft: '3px solid #e2e8f0' }}>
                    <div className="skeleton" style={{ height: 10, width: '35%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div className="skeleton" style={{ height: 20, width: 52, borderRadius: 100 }} />
                      <div className="skeleton" style={{ height: 20, width: 44, borderRadius: 100 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : view === 'list' ? (
          <div className="ticket-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Title</th><th>Type</th><th>Priority</th>
                  <th>Assignee</th><th>Due</th><th>Status</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td><div className="skeleton" style={{ height: 12, width: 60 }} /></td>
                    <td><div className="skeleton" style={{ height: 12, width: 200 }} /></td>
                    <td><div className="skeleton" style={{ height: 20, width: 50, borderRadius: 100 }} /></td>
                    <td><div className="skeleton" style={{ height: 20, width: 56, borderRadius: 100 }} /></td>
                    <td><div className="skeleton" style={{ height: 12, width: 90 }} /></td>
                    <td><div className="skeleton" style={{ height: 12, width: 70 }} /></td>
                    <td><div className="skeleton" style={{ height: 20, width: 72, borderRadius: 100 }} /></td>
                    <td><div className="skeleton" style={{ height: 12, width: 70 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ticket-cards">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="ticket-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="skeleton" style={{ height: 12, width: 60 }} />
                  <div className="skeleton" style={{ height: 20, width: 60, borderRadius: 100 }} />
                </div>
                <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '95%', marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <div className="skeleton" style={{ height: 20, width: 52, borderRadius: 100 }} />
                  <div className="skeleton" style={{ height: 20, width: 44, borderRadius: 100 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ height: 12, width: 80 }} />
                  <div className="skeleton" style={{ height: 12, width: 60 }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
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
                <th>ID</th><th>Title</th><th>Type</th><th>Priority</th>
                <th>Assignee</th><th>Due</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const a = userById(t.assignedTo);
                const overdue = isOverdue(t);
                return (
                  <tr key={t.id} onClick={() => openView(t)} style={{ cursor: 'pointer' }}>
                    <td className="ticket-id">{t.ticketNumber || t.id}</td>
                    <td>
                      <div className="ticket-title">{t.title}</div>
                      {(t.attachments || []).length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          <i className="fa-solid fa-paperclip" /> {t.attachments.length} attachment{t.attachments.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td><TypePill type={t.type} /></td>
                    <td><span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                    <td>{a ? a.name : t.assignedToName ? t.assignedToName : <em style={{ color: 'var(--muted)' }}>Unassigned</em>}</td>
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
            const coverImg = getFirstImgSrc(t.attachments);
            return (
              <div key={t.id} className="ticket-card" onClick={() => openView(t)}>
                {coverImg && (
                  <div className="card-cover-img">
                    <img src={coverImg} alt="attachment preview" />
                  </div>
                )}
                <div className="head">
                  <span className="tid">{t.ticketNumber || t.id}</span>
                  <span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span>
                </div>
                <h3>{t.title}</h3>
                <p className="desc">{t.description || 'No description'}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <TypePill type={t.type} />
                  {t.dueDate && (
                    <span className="badge" style={{ background: overdue ? '#fee2e2' : '#f3f4f6', color: overdue ? '#b91c1c' : 'var(--muted)' }}>
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
                    {a
                      ? <><span className="mini-avatar">{a.initials}</span> {a.name}</>
                      : t.assignedToName
                        ? t.assignedToName
                        : <em>Unassigned</em>}
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
                <h3>{col.label}<span className="count">{items.length}</span></h3>
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>
                    Drop tickets here
                  </div>
                )}
                {items.map((t) => {
                  const a = userById(t.assignedTo);
                  const overdue = isOverdue(t);
                  const canDrag = user.role === 'admin' || (user.role === 'agent' && t.assignedTo === user.id);
                  const coverImg = getFirstImgSrc(t.attachments);
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
                      {coverImg && (
                        <div className="kanban-card-img">
                          <img
                            src={coverImg}
                            alt="attachment preview"
                            style={{ cursor: 'zoom-in' }}
                            onClick={(e) => { e.stopPropagation(); window.open(coverImg, '_blank', 'noopener,noreferrer'); }}
                          />
                        </div>
                      )}
                      <div className="tid">{t.ticketNumber || t.id}</div>
                      <div className="title">{t.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className={`badge badge-pri-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <TypePill type={t.type} />
                      </div>
                      <div className="foot">
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {a
                            ? <><span className="mini-avatar" style={{ display: 'inline-grid', verticalAlign: 'middle', marginRight: 4 }}>{a.initials}</span>{a.name.split(' ')[0]}</>
                            : t.assignedToName
                              ? t.assignedToName.split(' ')[0]
                              : 'Unassigned'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                          {t.dueDate && (
                            <span style={{ color: overdue ? '#b91c1c' : 'var(--muted)', fontWeight: overdue ? 600 : 400 }}>
                              <i className="fa-solid fa-calendar" /> {fmtDate(t.dueDate)}
                            </span>
                          )}
                          {(t.comments || []).length > 0 && (
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

      {modalMode && <TicketModal mode={modalMode} ticket={activeTicket} onClose={closeModal} />}
    </div>
  );
}
