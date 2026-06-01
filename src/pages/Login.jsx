import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: 'fa-crown' },
  { key: 'agent', label: 'Agent', icon: 'fa-headset' },
];

const SAMPLE_EMAIL = {
  admin: 'admin@helio.app',
  agent: 'omar@helio.app',
};

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState(SAMPLE_EMAIL.admin);
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState('');

  const handleRole = (key) => {
    setRole(key);
    setEmail(SAMPLE_EMAIL[key]);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(role, email);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    nav('/');
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="brand-block">
          <div className="brand-mark">h</div>
          <h1>Helio</h1>
          <p>Operations CRM</p>
        </div>
        <div className="quote">
          A single workspace for tickets, broadcasts, and structured intake —
          designed for teams that move fast and keep every detail in view.
        </div>
      </div>

      <div className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="lead">Sign in to manage tickets, notifications, and forms.</p>

          <div className="role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={role === r.key ? 'active' : ''}
                onClick={() => handleRole(r.key)}
              >
                <i className={`fa-solid ${r.icon}`} style={{ marginRight: 6 }} />
                {r.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@helio.app"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            <i className="fa-solid fa-arrow-right-to-bracket" />
            Sign in as {ROLES.find((r) => r.key === role).label}
          </button>

          <div className="demo-creds">
            <strong>Demo mode:</strong> Any password works. Try these accounts —
            <br />
            <code>admin@helio.app</code> · <code>omar@helio.app</code>
          </div>
        </form>
      </div>
    </div>
  );
}
