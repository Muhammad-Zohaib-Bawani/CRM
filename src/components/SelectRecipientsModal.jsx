import { useState, useEffect } from 'react';
import { listUsers } from '../services/users.js';

const PAGE_SIZE = 10;

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
      {checked      && <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#fff' }} />}
      {!checked && indeterminate && <i className="fa-solid fa-minus" style={{ fontSize: 9, color: '#fff' }} />}
    </div>
  );
}

export default function SelectRecipientsModal({ onImport, onClose, currentlyImported = [] }) {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // selected IDs + map of id→contact for cross-page tracking
  const [selected, setSelected]               = useState(() => new Set(currentlyImported.map((c) => c.id)));
  const [selectedContacts, setSelectedContacts] = useState(() => {
    const m = new Map();
    currentlyImported.forEach((c) => m.set(c.id, c));
    return m;
  });

  // Debounce search 400 ms, reset to page 1
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch on page / debounced search change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    listUsers({ pageNumber: page, pageSize: PAGE_SIZE, search: debouncedSearch })
      .then(({ items, total: t }) => {
        if (!cancelled) { setUsers(items); setTotal(t); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setFetchError(err.message || 'Failed to load users'); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const allPageSelected  = users.length > 0 && users.every((u) => selected.has(u.id));
  const somePageSelected = !allPageSelected && users.some((u) => selected.has(u.id));

  const toggleOne = (id) => {
    const contact = users.find((u) => u.id === id);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSelectedContacts((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else if (contact) next.set(id, contact);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) users.forEach((u) => next.delete(u.id));
      else users.forEach((u) => next.add(u.id));
      return next;
    });
    setSelectedContacts((prev) => {
      const next = new Map(prev);
      if (allPageSelected) users.forEach((u) => next.delete(u.id));
      else users.forEach((u) => next.set(u.id, u));
      return next;
    });
  };

  const handleImport = () => {
    const picked = [...selectedContacts.values()].map((u) => ({
      id:       u.id,
      name:     u.name,
      email:    u.email,
      initials: u.initials,
      userType: u.roleName || u.role || 'User',
      status:   u.isActive !== false ? 'Active' : 'Inactive',
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
              {total.toLocaleString()} user{total === 1 ? '' : 's'} available
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 16 }}>

          {/* ── Search ── */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontSize: 13, pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search by name or email…"
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
          <div className="import-table-wrap" style={{ position: 'relative' }}>
            {loading && users.length > 0 && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 10, zIndex: 2,
                background: 'rgba(255,255,255,0.65)', display: 'grid', placeItems: 'center',
              }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20, color: 'var(--brand)' }} />
              </div>
            )}
            <table className="import-table">
              <thead>
                <tr>
                  <th style={{ width: 50, paddingLeft: 16 }}>
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>User</th>
                  <th style={{ width: 140 }}>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22, color: 'var(--brand)', display: 'block', marginBottom: 8 }} />
                      Loading users…
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 22, color: '#ef4444', display: 'block', marginBottom: 8 }} />
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{fetchError}</span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr style={{ pointerEvents: 'none' }}>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)', fontSize: 13 }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ display: 'block', fontSize: 22, opacity: 0.25, marginBottom: 10 }} />
                      No users match &ldquo;<strong style={{ color: 'var(--ink)' }}>{search}</strong>&rdquo;
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSel = selected.has(u.id);
                    return (
                      <tr key={u.id} onClick={() => toggleOne(u.id)} className={isSel ? 'is-selected' : ''}>
                        <td style={{ paddingLeft: 16 }}>
                          <Checkbox checked={isSel} onChange={() => toggleOne(u.id)} />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
                            {u.name}
                          </span>
                        </td>
                        <td>
                          <span className={`type-pill type-${(u.roleName || u.role || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {u.roleName || u.role || '—'}
                          </span>
                        </td>
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

          {/* ── Pagination ── */}
          {!fetchError && totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, paddingTop: 12,
            }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!hasPrevPage || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="fa-solid fa-chevron-left" /> Prev
              </button>
              <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 120, textAlign: 'center' }}>
                Page <strong style={{ color: 'var(--ink)' }}>{page}</strong> of {totalPages.toLocaleString()}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          )}
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
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
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
