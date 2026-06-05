import { useState, useMemo, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import UserModal from '../components/UserModal.jsx';
import { rsStylesCompact, toOptions, findOption } from '../utils/selectStyles.js';
import { ROLE_META } from '../enums/roles.js';


function SkeletonRow() {
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
          <span className="skeleton" style={{ width: 130, height: 14 }} />
        </div>
      </td>
      <td><span className="skeleton" style={{ width: 170, height: 12 }} /></td>
      <td><span className="skeleton" style={{ width: 76, height: 24, borderRadius: 20 }} /></td>
      <td><span className="skeleton" style={{ width: 110, height: 12 }} /></td>
      <td><span className="skeleton" style={{ width: 56, height: 22, borderRadius: 20 }} /></td>
      <td style={{ textAlign: 'center' }}>
        <span className="skeleton" style={{ width: 64, height: 28, borderRadius: 6, margin: '0 auto' }} />
      </td>
    </tr>
  );
}

export default function Users() {
  useAuth();
  const {
    managedUsers, managedUsersLoading, loadManagedUsers,
    roles,
    addManagedUser, updateManagedUser, deleteManagedUser, resendUserInvitation,
    showToast,
  } = useData();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [modalMode, setModalMode] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(null);

  useEffect(() => { loadManagedUsers(); }, [loadManagedUsers]);

  const roleOpts = useMemo(() => {
    const base = roles.map((r) => ({ value: r.code, label: r.name }));
    return toOptions(base, 'All roles');
  }, [roles]);

  const filtered = useMemo(() => {
    return managedUsers.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.phone || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [managedUsers, search, filterRole]);

  const openCreate = () => { setActiveUser(null); setModalMode('create'); };
  const openEdit = (u) => { setActiveUser(u); setModalMode('edit'); };
  const closeModal = useCallback(() => { setActiveUser(null); setModalMode(null); }, []);

  const handleSave = useCallback(async (formData) => {
    const roleObj = roles.find((r) => r.code === formData.role);
    const phone = [formData.dialCode, formData.mobile].filter(Boolean).join(' ').trim() || null;
    const req = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: phone || undefined,
      roleId: roleObj?.id,
    };
    if (formData.password) req.password = formData.password;

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await addManagedUser(req);
      } else {
        await updateManagedUser(activeUser.id, req);
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save user', 'fa-triangle-exclamation');
    } finally {
      setSaving(false);
    }
  }, [modalMode, activeUser, roles, addManagedUser, updateManagedUser, closeModal, showToast]);

  const handleResendInvitation = useCallback(async (id) => {
    setResending(id);
    try {
      await resendUserInvitation(id);
    } catch (err) {
      showToast(err.message || 'Failed to resend invitation', 'fa-triangle-exclamation');
    } finally {
      setResending(null);
    }
  }, [resendUserInvitation, showToast]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteManagedUser(deleteConfirm);
      setDeleteConfirm(null);
    } catch {
      // toast shown by context
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, deleteManagedUser]);

  const deletingUser = managedUsers.find((u) => u.id === deleteConfirm);

  return (
    <div>
      {/* Page header */}
      <div className="page-head">
        <div>
          <h1>User Management</h1>
          <div className="sub">
            {managedUsersLoading
              ? 'Loading…'
              : `${filtered.length} of ${managedUsers.length} user${managedUsers.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button className="btn btn-gold" onClick={openCreate} disabled={managedUsersLoading}>
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
            disabled={managedUsersLoading}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select
            options={roleOpts}
            value={findOption(roleOpts, filterRole)}
            onChange={(opt) => setFilterRole(opt?.value ?? 'all')}
            placeholder="All roles"
            isClearable={filterRole !== 'all'}
            styles={rsStylesCompact}
            menuPortalTarget={document.body}
            isDisabled={managedUsersLoading}
          />
        </div>
      </div>

      {/* Skeleton */}
      {managedUsersLoading ? (
        <div className="ticket-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
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
        /* Data table */
        <div className="ticket-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rm = ROLE_META[u.role] || { label: u.roleName || u.role, cls: 'type-user', icon: 'fa-user' };
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

                    {/* Phone */}
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                      {u.phone || '—'}
                    </td>

                    {/* Status */}
                    <td>
                      {u.hasPendingInvitation ? (
                        <span
                          className="type-pill"
                          style={{ background: '#fef3c7', color: '#b45309' }}
                        >
                          <i className="fa-solid fa-envelope-open" style={{ marginRight: 5 }} />
                          Pending
                        </span>
                      ) : (
                        <span
                          className="type-pill"
                          style={{
                            background: u.isActive ? 'var(--success-soft, #dcfce7)' : '#fee2e2',
                            color: u.isActive ? 'var(--success, #16a34a)' : '#b91c1c',
                          }}
                        >
                          <i className={`fa-solid ${u.isActive ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 5 }} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {u.hasPendingInvitation && (
                          <button
                            className="user-action-btn"
                            title="Resend invitation"
                            disabled={resending === u.id}
                            onClick={() => handleResendInvitation(u.id)}
                          >
                            {resending === u.id
                              ? <i className="fa-solid fa-circle-notch fa-spin" />
                              : <i className="fa-solid fa-paper-plane" />}
                          </button>
                        )}
                        <button className="user-action-btn" title="Edit user" onClick={() => openEdit(u)}>
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
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
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
              {!deleting && <i className="fa-solid fa-xmark close" onClick={() => setDeleteConfirm(null)} />}
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--ink)' }}>{deletingUser?.name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> Deleting…</>
                  : <><i className="fa-solid fa-trash" /> Delete</>}
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
          roles={roles}
          saving={saving}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
