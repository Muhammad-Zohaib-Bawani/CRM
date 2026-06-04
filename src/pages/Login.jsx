import { useState, useTransition } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";

const ROLES = [
  { key: "admin", label: "Admin", icon: "fa-crown" },
  { key: "agent", label: "Agent", icon: "fa-headset" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRole = (key) => {
    setRole(key);
    setEmail(null);
    setPassword(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) { setError(result.error); return; }
      nav("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="brand-block">
          <img
            src="/Images/logo_light.png"
            alt="GCAT CRM"
            className="login-logo"
          />
          <p className="login-project-name">GCAT CRM</p>
        </div>
        <div className="quote">
          A single workspace for tickets, broadcasts, and structured intake —
          designed for teams that move fast and keep every detail in view.
        </div>
      </div>

      <div className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="lead">
            Sign in to manage tickets, notifications, and forms.
          </p>

          <div className="role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={role === r.key ? "active" : ""}
                onClick={() => handleRole(r.key)}
                disabled={loading}
              >
                <i
                  className={`fa-solid ${r.icon}`}
                  style={{ marginRight: 6 }}
                />
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
              placeholder="you@gcat.app"
              required
              disabled={loading}
            />
          </div>

          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label>Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            disabled={loading}
          >
            {loading ? (
              <><i className="fa-solid fa-circle-notch fa-spin" /> Signing in…</>
            ) : (
              <><i className="fa-solid fa-arrow-right-to-bracket" /> Sign in as {ROLES.find((r) => r.key === role).label}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
