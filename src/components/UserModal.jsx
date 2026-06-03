import { useState, useEffect } from 'react';
import Select from 'react-select';
import { rsStyles } from '../utils/selectStyles.js';
import { COUNTRY_OPTS, DIAL_OPTS } from '../data/countries.js';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: 'fa-crown' },
  { value: 'agent', label: 'Agent', icon: 'fa-headset' },
  { value: 'user', label: 'General User', icon: 'fa-user' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'user',
  country: '',
  dialCode: '+1',
  mobile: '',
  password: '',
  confirmPassword: '',
};

function formatDialLabel(opt, { context }) {
  return context === 'value' ? opt.value : `${opt.value} — ${opt.label}`;
}

export default function UserModal({ mode, user, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === 'edit' && user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        role: user.role || 'user',
        country: user.country || '',
        dialCode: user.dialCode || '+1',
        mobile: user.mobile || '',
        password: '',
        confirmPassword: '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [mode, user]);

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
    if (!form.country) e.country = 'Country is required';
    if (!form.mobile.trim()) e.mobile = 'Mobile number is required';
    if (needsPassword) {
      if (mode === 'create' && !form.password) {
        e.password = 'Password is required';
      }
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

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const initials = (firstName[0] + lastName[0]).toUpperCase();

    onSave({
      ...(user || {}),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: form.email.trim(),
      role: form.role,
      country: form.country,
      dialCode: form.dialCode,
      mobile: form.mobile.trim(),
      initials,
      ...(needsPassword && form.password ? { password: form.password } : {}),
    });
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

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
          <i className="fa-solid fa-xmark close" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Role */}
            <div className="field">
              <label>Role</label>
              <Select
                options={ROLES}
                value={ROLES.find((r) => r.value === form.role) || null}
                onChange={(opt) => set('role', opt?.value || 'user')}
                formatOptionLabel={(opt) => (
                  <span>
                    <i className={`fa-solid ${opt.icon}`} style={{ marginRight: 8, opacity: 0.6 }} />
                    {opt.label}
                  </span>
                )}
                styles={rsStyles}
                menuPortalTarget={document.body}
                placeholder="Select role"
                isSearchable={false}
              />
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
              />
              {errors.email && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.email}</div>}
            </div>

            {/* Country */}
            <div className="field">
              <label>Country</label>
              <Select
                options={COUNTRY_OPTS}
                value={COUNTRY_OPTS.find((c) => c.value === form.country) || null}
                onChange={(opt) => set('country', opt?.value || '')}
                styles={rsStyles}
                menuPortalTarget={document.body}
                placeholder="Select country"
                isClearable
              />
              {errors.country && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.country}</div>}
            </div>

            {/* Mobile with dial code */}
            <div className="field">
              <label>Mobile Number</label>
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
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => set('mobile', e.target.value)}
                    placeholder="555 000 0000"
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
                  />
                  {errors.confirmPassword && <div className="field-error"><i className="fa-solid fa-circle-exclamation" />{errors.confirmPassword}</div>}
                </div>
              </>
            )}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <i className={`fa-solid ${mode === 'create' ? 'fa-user-plus' : 'fa-check'}`} />
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
