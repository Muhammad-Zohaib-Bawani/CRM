import { useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';
import { ROLE_META } from '../enums/roles.js';

function Checkbox({ checked, indeterminate = false, onChange }) {
  const active = checked || indeterminate;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
        border: `2px solid ${active ? 'var(--brand)' : 'var(--line)'}`,
        background: active ? 'var(--brand)' : '#fff',
        display: 'grid', placeItems: 'center',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {checked && <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#fff' }} />}
      {!checked && indeterminate && <i className="fa-solid fa-minus" style={{ fontSize: 9, color: '#fff' }} />}
    </div>
  );
}

export default function SelectRecipientsModal({ onImport, onClose, currentlyImported = [] }) {
  const { users, managedUsers } = useData();

  const allUsers = useMemo(() => {
    const apiIds = new Set(users.map((u) => u.id));
    return [...users, ...managedUsers.filter((u) => !apiIds.has(u.id))];
  }, [users, managedUsers]);

  const [selected, setSelected] = useState(() => new Set(currentlyImported.map((c) => c.id)));
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (ROLE_META[u.role]?.label || u.role || '').toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));
  const someSelected = !allSelected && filtered.some((u) => selected.has(u.id));

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((u) => next.delete(u.id));
      else filtered.forEach((u) => next.add(u.id));
      return next;
    });

  const handleImport = () => {
    const picked = allUsers
      .filter((u) => selected.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        initials: u.initials || (u.name || '').slice(0, 2).toUpperCase(),
        userType: ROLE_META[u.role]?.label || u.role,
        status: 'Active',
      }));
    onImport(picked);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-head">
          <div>
            <h2>Select Recipients</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {allUsers.length} user{allUsers.length === 1 ? '' : 's'} available
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 16 }}>

          {/* ── Search ── */}
          <div style={{
            position: 'relative',
            marginBottom: 16,
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontSize: 13, pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 40px 10px 38px',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                background: '#f8fafc',
                fontSize: 13,
                color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--brand)';
                e.target.style.background = '#fff';
                e.target.style.boxShadow = '0 0 0 3px rgba(184,139,86,0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--line)';
                e.target.style.background = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Clear"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 22, height: 22, borderRadius: 6,
                  display: 'grid', placeItems: 'center',
                  background: 'var(--line)', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 10, transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--line)'}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th style={{ width: 50, paddingLeft: 16 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>User</th>
                  <th style={{ width: 130 }}>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr style={{ pointerEvents: 'none' }}>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)', fontSize: 13 }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ display: 'block', fontSize: 22, opacity: 0.25, marginBottom: 10 }} />
                      No users match &ldquo;<strong style={{ color: 'var(--ink)' }}>{search}</strong>&rdquo;
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isSel = selected.has(u.id);
                    const rm = ROLE_META[u.role] || { label: u.role, cls: 'type-user', icon: 'fa-user' };
                    return (
                      <tr key={u.id} onClick={() => toggleOne(u.id)} className={isSel ? 'is-selected' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <Checkbox checked={isSel} onChange={() => toggleOne(u.id)} />
                        </td>

                        {/* User */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              className="user-avatar-sm"
                              style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
                            >
                              {u.initials || (u.name || '').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
                              {u.name}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <span className={`type-pill ${rm.cls}`}>
                            <i className={`fa-solid ${rm.icon}`} style={{ marginRight: 5 }} />
                            {rm.label}
                          </span>
                        </td>

                        {/* Email */}
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                          {u.email}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="modal-foot">
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            {selected.size > 0 ? (
              <>
                <span style={{
                  background: 'var(--brand)', color: '#fff',
                  borderRadius: 20, padding: '2px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                }}>
                  {selected.size}
                </span>
                <span style={{ color: 'var(--muted)' }}>
                  {selected.size === 1 ? 'user' : 'users'} selected
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--muted)' }}>No users selected</span>
            )}
          </div>

          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={selected.size === 0}
          >
            <i className="fa-solid fa-user-check" />
            Add {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'recipient' : 'recipients'}
          </button>
        </div>

      </div>
    </div>
  );
}
