import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { validateResetToken, resetPassword } from '../services/auth.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const nav = useNavigate();

  const [tokenState, setTokenState] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenState('invalid'); return; }
    let cancelled = false;
    validateResetToken(token)
      .then(() => { if (!cancelled) setTokenState('valid'); })
      .catch(() => { if (!cancelled) setTokenState('invalid'); });
    return () => { cancelled = true; };
  }, [token]);

  const validate = () => {
    const e = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to reset password. The link may have expired.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="brand-block">
          <img src="/Images/logo_light.png" alt="GCAT CRM" className="login-logo" />
          <p className="login-project-name">GCAT CRM</p>
        </div>
        <div className="quote">
          Choose a strong password to secure your account.
        </div>
      </div>

      <div className="login-form-wrap">
        {tokenState === 'checking' && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--brand)' }} />
          </div>
        )}

        {tokenState === 'invalid' && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16, color: '#b91c1c' }}>
              <i className="fa-solid fa-circle-xmark" />
            </div>
            <h2>Link expired or invalid</h2>
            <p className="lead" style={{ marginBottom: 24 }}>
              This password setup link is no longer valid. Request a new one.
            </p>
            <Link to="/forgot-password" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-envelope" /> Request New Link
            </Link>
          </div>
        )}

        {tokenState === 'valid' && done && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16, color: 'var(--status-completed, #16a34a)' }}>
              <i className="fa-solid fa-circle-check" />
            </div>
            <h2>Password set!</h2>
            <p className="lead" style={{ marginBottom: 24 }}>
              Your password has been set successfully. You can now sign in.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-arrow-right-to-bracket" /> Sign In
            </Link>
          </div>
        )}

        {tokenState === 'valid' && !done && (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Set your password</h2>
            <p className="lead">Choose a password for your account.</p>

            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.password && (
                <div className="field-error">
                  <i className="fa-solid fa-circle-exclamation" /> {errors.password}
                </div>
              )}
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <div className="field-error">
                  <i className="fa-solid fa-circle-exclamation" /> {errors.confirmPassword}
                </div>
              )}
            </div>

            {errors.submit && (
              <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {errors.submit}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading}
            >
              {loading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</>
                : <><i className="fa-solid fa-lock" /> Set Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
