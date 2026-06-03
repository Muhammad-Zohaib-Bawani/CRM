import { useState, useMemo } from 'react';
import Select from 'react-select';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import UserModal from '../components/UserModal.jsx';
import { rsStylesCompact, toOptions, findOption } from '../utils/selectStyles.js';
import { COUNTRY_MAP } from '../data/countries.js';

const ROLE_OPTS = toOptions(
  [
    { value: 'admin', label: 'Admin' },
    { value: 'agent', label: 'Agent' },
    { value: 'user', label: 'General User' },
  ],
  'All roles',
);

const ROLE_META = {
  admin: { label: 'Admin', cls: 'type-admin', icon: 'fa-crown' },
  agent: { label: 'Agent', cls: 'type-agent', icon: 'fa-headset' },
  user: { label: 'General User', cls: 'type-user', icon: 'fa-user' },
};

export default function Users() {
  useAuth();
  const { managedUsers, addManagedUser, updateManagedUser, deleteManagedUser } = useData();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [modalMode, setModalMode] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = useMemo(() => {
    return managedUsers.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.mobile || '').includes(q)
        ) return false;
      }
      return true;
    });
  }, [managedUsers, search, filterRole]);

  const openCreate = () => { setActiveUser(null); setModalMode('create'); };
  const openEdit = (u) => { setActiveUser(u); setModalMode('edit'); };
  const closeModal = () => { setActiveUser(null); setModalMode(null); };

  const handleSave = (data) => {
    if (modalMode === 'create') {
      addManagedUser(data);
    } else {
      updateManagedUser(data.id, data);
    }
    closeModal();
  };

  const handleDelete = () => {
    deleteManagedUser(deleteConfirm);
    setDeleteConfirm(null);
  };

  const deletingUser = managedUsers.find((u) => u.id === deleteConfirm);

  return (
    <div>
      {/* Page header */}
      <div className="page-head">
        <div>
          <h1>User Management</h1>
          <div className="sub">
            {filtered.length} of {managedUsers.length} user{managedUsers.length === 1 ? '' : 's'}
          </div>
        </div>
        <button className="btn btn-gold" onClick={openCreate}>
          <i className="fa-solid fa-user-plus" /> Add User
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select
            options={ROLE_OPTS}
            value={findOption(ROLE_OPTS, filterRole)}
            onChange={(opt) => setFilterRole(opt?.value ?? 'all')}
            placeholder="All roles"
            isClearable={filterRole !== 'all'}
            styles={rsStylesCompact}
            menuPortalTarget={document.body}
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-users" />
          <h3>No users found</h3>
          <p>
            {search || filterRole !== 'all'
              ? 'Try clearing a filter or adjusting your search.'
              : 'Add your first user to get started.'}
          </p>
          {!search && filterRole === 'all' && (
            <button className="btn btn-gold" onClick={openCreate} style={{ marginTop: 16 }}>
              <i className="fa-solid fa-user-plus" /> Add User
            </button>
          )}
        </div>
      ) : (
        <div className="ticket-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Country</th>
                <th>Mobile</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rm = ROLE_META[u.role] || ROLE_META.user;
                const countryName = COUNTRY_MAP[u.country] || u.country || '—';
                return (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(u)}>
                    {/* User */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar-sm">{u.initials}</div>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                      {u.email}
                    </td>

                    {/* Role */}
                    <td>
                      <span className={`type-pill ${rm.cls}`}>
                        <i className={`fa-solid ${rm.icon}`} style={{ marginRight: 5 }} />
                        {rm.label}
                      </span>
                    </td>

                    {/* Country */}
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{countryName}</td>

                    {/* Mobile */}
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                      {u.dialCode} {u.mobile}
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          className="user-action-btn"
                          title="Edit user"
                          onClick={() => openEdit(u)}
                        >
                          <i className="fa-solid fa-pencil" />
                        </button>
                        <button
                          className="user-action-btn danger"
                          title="Delete user"
                          onClick={() => setDeleteConfirm(u.id)}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div
            className="modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#fee2e2', color: '#b91c1c',
                  display: 'grid', placeItems: 'center', fontSize: 16,
                }}>
                  <i className="fa-solid fa-trash" />
                </div>
                <h2>Delete User</h2>
              </div>
              <i className="fa-solid fa-xmark close" onClick={() => setDeleteConfirm(null)} />
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--ink)' }}>{deletingUser?.name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <i className="fa-solid fa-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          user={activeUser}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
