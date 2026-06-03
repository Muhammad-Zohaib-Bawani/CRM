import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';

const NAV = {
  admin: [
    { to: '/', label: 'Dashboard', icon: 'fa-grip' },
    { to: '/tickets', label: 'Tickets', icon: 'fa-ticket' },
    { to: '/notifications', label: 'Notifications', icon: 'fa-paper-plane' },
    { to: '/forms', label: 'Dynamic Forms', icon: 'fa-clipboard-list' },
  ],
  agent: [
    { to: '/', label: 'Dashboard', icon: 'fa-grip' },
    { to: '/tickets', label: 'My Tickets', icon: 'fa-ticket' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { toast, resetAll } = useData();
  const nav = useNavigate();
  const items = NAV[user.role] || [];

  const handleLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/Images/logo_light.png" alt="GCAT CRM" className="topbar-logo" />
        </div>

        <div className="top-actions">
          <button className="icon-btn" title="Reset demo data" onClick={resetAll}>
            <i className="fa-solid fa-rotate-left" />
          </button>
          <button className="icon-btn" title="Notifications">
            <i className="fa-regular fa-bell" />
            <span className="dot" />
          </button>
          <div className="user-chip">
            <div className="avatar">{user.initials}</div>
            <div>
              <div className="name">{user.name}</div>
              <div className="role">{user.role}</div>
            </div>
          </div>
          <button className="icon-btn" title="Sign out" onClick={handleLogout}>
            <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h4>Quick Menu</h4>
          <div className="nav-grid">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-card ${isActive ? 'active' : ''}`}
              >
                <i className={`fa-solid ${item.icon}`} />
                {item.label}
              </NavLink>
            ))}
          </div>

          <h4>Account</h4>
          <div className="nav-grid">
            <div className="nav-card" onClick={handleLogout} role="button">
              <i className="fa-solid fa-arrow-right-from-bracket" />
              Sign out
            </div>
          </div>
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div className="toast" key={toast.id}>
          <i className={`fa-solid ${toast.icon}`} />
          {toast.message}
        </div>
      )}
    </>
  );
}
