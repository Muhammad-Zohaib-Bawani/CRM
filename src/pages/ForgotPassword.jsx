import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
          Enter your email and we'll send you a link to reset your password.
        </div>
      </div>

      <div className="login-form-wrap">
        {sent ? (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16, color: 'var(--brand)' }}>
              <i className="fa-solid fa-envelope-circle-check" />
            </div>
            <h2>Check your inbox</h2>
            <p className="lead" style={{ marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <i className="fa-solid fa-arrow-left" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Forgot password?</h2>
            <p className="lead">Enter your email and we'll send you a reset link.</p>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gcat.app"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading}
            >
              {loading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</>
                : <><i className="fa-solid fa-paper-plane" /> Send Reset Link</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
              <Link to="/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }} />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
