import { useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';

export default function SelectRecipientsModal({ onImport, onClose, currentlyImported = [] }) {
  const { users } = useData();
  const [selected, setSelected] = useState(() => new Set(currentlyImported.map((c) => c.id)));
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

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
    const picked = users
      .filter((u) => selected.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        initials: u.initials,
        userType: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        status: 'Active',
      }));
    onImport(picked);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Select Recipients</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Choose from local system users to add to the broadcast list.
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 16 }}>
          <div className="import-table-toolbar">
            <div className="search" style={{ flex: 1 }}>
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search by name, email or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`btn btn-sm ${allSelected ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleAll}
              disabled={filtered.length === 0}
            >
              <i className={`fa-solid ${allSelected ? 'fa-square-check' : 'fa-square'}`} />
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSel = selected.has(u.id);
                  return (
                    <tr key={u.id} onClick={() => toggleOne(u.id)} className={isSel ? 'is-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(u.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 16, height: 16, accentColor: 'var(--brand)' }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="mini-avatar">{u.initials}</span>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`type-pill type-${u.role}`}>{u.role}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                        {u.email}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-foot">
          <span style={{ marginRight: 'auto', color: 'var(--muted)', fontSize: 13 }}>
            <strong style={{ color: 'var(--ink)' }}>{selected.size}</strong> of {users.length} users selected
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={selected.size === 0}
          >
            <i className="fa-solid fa-user-check" /> Add {selected.size || ''} {selected.size === 1 ? 'recipient' : 'recipients'}
          </button>
        </div>
      </div>
    </div>
  );
}
