import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { rsStyles } from '../utils/selectStyles.js';
import { DIAL_OPTS } from '../data/countries.js';

const ROLE_ICONS = { admin: 'fa-crown', agent: 'fa-headset' };

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  dialCode: '+1',
  mobile: '',
  password: '',
  confirmPassword: '',
};

function formatDialLabel(opt, { context }) {
  return context === 'value' ? opt.value : `${opt.value} — ${opt.label}`;
}

export default function UserModal({ mode, user, roles = [], saving = false, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const roleOptions = useMemo(() => roles.map((r) => ({
    value: r.code,
    label: r.name,
    icon: ROLE_ICONS[r.code] || 'fa-user',
  })), [roles]);

  const defaultRole = roleOptions[0]?.value || '';

  useEffect(() => {
    if (mode === 'edit' && user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        role: user.role || defaultRole,
        dialCode: user.dialCode || '+1',
        mobile: user.mobile || user.phone || '',
        password: '',
        confirmPassword: '',
      });
    } else {
      setForm({ ...EMPTY_FORM, role: defaultRole });
    }
    setErrors({});
  }, [mode, user, defaultRole]);

  const needsPassword = form.role === 'admin' || form.role === 'agent';

  const set = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.mobile.trim()) e.mobile = 'Phone number is required';
    if (!form.role) e.role = 'Role is required';
    if (needsPassword) {
      if (mode === 'create' && !form.password) e.password = 'Password is required';
      if (form.password) {
        if (form.password.length < 6) e.password = 'Must be at least 6 characters';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      }
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      ...(user || {}),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      role: form.role,
      dialCode: form.dialCode,
      mobile: form.mobile.trim(),
      ...(needsPassword && form.password ? { password: form.password } : {}),
    });
  };

  const handleBackdrop = (e) => { if (!saving && e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--brand-soft)', color: 'var(--brand-deep)',
              display: 'grid', placeItems: 'center', fontSize: 16,
            }}>
              <i className={`fa-solid ${mode === 'create' ? 'fa-user-plus' : 'fa-user-pen'}`} />
            </div>
            <h2>{mode === 'create' ? 'Add User' : 'Edit User'}</h2>
          </div>
          {!saving && <i className="fa-solid fa-xmark close" onClick={onClose} />}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Role */}
            <div className="field">
              <label>Role</label>
              <Select
                options={roleOptions}
                value={roleOptions.find((r) => r.value === form.role) || null}
                onChange={(opt) => set('role', opt?.value || '')}
                formatOptionLabel={(opt) => (
                  <span>
                    <i className={`fa-solid ${opt.icon}`} style={{ marginRight: 8, opacity: 0.6 }} />
                    {opt.label}
                  </span>
                )}
                styles={rsStyles}
                menuPortalTarget={document.body}
                placeholder={roles.length === 0 ? 'Loading roles…' : 'Select role'}
                isSearchable={false}
                isDisabled={saving || roles.length === 0}
              />
              {errors.role && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.role}</div>}
            </div>

            {/* First + Last Name */}
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  placeholder="John"
                  disabled={saving}
                />
                {errors.firstName && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.firstName}</div>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Doe"
                  disabled={saving}
                />
                {errors.lastName && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.lastName}</div>}
              </div>
            </div>

            {/* Email */}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="john@example.com"
                disabled={saving || mode === 'edit'}
              />
              {errors.email && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.email}</div>}
            </div>

            {/* Phone with dial code */}
            <div className="field">
              <label>Phone Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <Select
                    options={DIAL_OPTS}
                    value={DIAL_OPTS.find((d) => d.value === form.dialCode) || null}
                    onChange={(opt) => set('dialCode', opt?.value || '+1')}
                    formatOptionLabel={formatDialLabel}
                    styles={rsStyles}
                    menuPortalTarget={document.body}
                    placeholder="+1"
                    isSearchable
                    isDisabled={saving}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => set('mobile', e.target.value)}
                    placeholder="555 000 0000"
                    disabled={saving}
                  />
                </div>
              </div>
              {errors.mobile && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.mobile}</div>}
            </div>

            {/* Password — only for Admin & Agent */}
            {needsPassword && (
              <>
                <div className="field">
                  <label>
                    Password
                    {mode === 'edit' && (
                      <span style={{
                        fontWeight: 400, textTransform: 'none',
                        letterSpacing: 0, fontSize: 11, color: 'var(--muted)', marginLeft: 6,
                      }}>
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={saving}
                  />
                  {errors.password && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.password}</div>}
                </div>

                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={saving}
                  />
                  {errors.confirmPassword && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.confirmPassword}</div>}
                </div>
              </>
            )}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</>
              ) : (
                <><i className={`fa-solid ${mode === 'create' ? 'fa-user-plus' : 'fa-check'}`} />
                {mode === 'create' ? 'Create User' : 'Save Changes'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
