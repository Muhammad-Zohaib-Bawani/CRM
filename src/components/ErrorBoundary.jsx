import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, errorInfo } = this.state;

    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          {/* Icon */}
          <div style={styles.iconWrap}>
            <i className="fa-solid fa-triangle-exclamation" style={styles.icon} />
          </div>

          {/* Heading */}
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.subtitle}>
            An unexpected error occurred. You can try reloading the page or
            returning to the dashboard.
          </p>

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.btnPrimary} onClick={this.handleReset}>
              <i className="fa-solid fa-house" style={{ marginRight: 8 }} />
              Go to Dashboard
            </button>
            <button style={styles.btnGhost} onClick={this.handleReload}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: 8 }} />
              Reload Page
            </button>
          </div>

          {/* Error detail — dev only */}
          {isDev && (
            <details style={styles.details}>
              <summary style={styles.summary}>
                <i className="fa-solid fa-bug" style={{ marginRight: 6 }} />
                Error details (dev mode)
              </summary>
              <div style={styles.errorBlock}>
                <p style={styles.errorMessage}>{error.toString()}</p>
                {errorInfo?.componentStack && (
                  <pre style={styles.stack}>{errorInfo.componentStack}</pre>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Branding footer */}
        <p style={styles.brand}>GCAT CRM</p>
      </div>
    );
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fb',
    padding: '24px 16px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 12px 40px rgba(15,23,42,0.10)',
    padding: '48px 40px 40px',
    maxWidth: 520,
    width: '100%',
    textAlign: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  icon: {
    fontSize: 30,
    color: '#d97706',
  },
  title: {
    margin: '0 0 12px',
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: '0 0 32px',
    fontSize: 14,
    color: '#64748b',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: '#b88b56',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  details: {
    textAlign: 'left',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 20,
  },
  summary: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    userSelect: 'none',
    listStyle: 'none',
    outline: 'none',
  },
  errorBlock: {
    marginTop: 14,
    padding: 16,
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 10,
  },
  errorMessage: {
    margin: '0 0 10px',
    fontSize: 13,
    fontWeight: 600,
    color: '#991b1b',
    wordBreak: 'break-word',
  },
  stack: {
    margin: 0,
    fontSize: 11,
    color: '#7f1d1d',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
    lineHeight: 1.6,
  },
  brand: {
    marginTop: 32,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
};
