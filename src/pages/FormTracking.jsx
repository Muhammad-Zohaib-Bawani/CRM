import { useState, useMemo } from 'react';
import { useData } from '../store/DataContext.jsx';

const ROLE_META = {
  admin: { label: 'Admin', cls: 'type-admin', icon: 'fa-crown' },
  agent: { label: 'Agent', cls: 'type-agent', icon: 'fa-headset' },
  user: { label: 'General User', cls: 'type-user', icon: 'fa-user' },
  Admin: { label: 'Admin', cls: 'type-admin', icon: 'fa-crown' },
  Agent: { label: 'Agent', cls: 'type-agent', icon: 'fa-headset' },
  'General User': { label: 'General User', cls: 'type-user', icon: 'fa-user' },
  Manager: { label: 'Manager', cls: 'type-manager', icon: 'fa-briefcase' },
  Owner: { label: 'Owner', cls: 'type-owner', icon: 'fa-star' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FormTracking() {
  const { notifications, forms, formResponses } = useData();

  const [expandedId, setExpandedId] = useState(null);
  const [responseModal, setResponseModal] = useState(null); // { recipient, response, form }
  const [copiedId, setCopiedId] = useState(null);

  // Notifications that had a form attached
  const tracked = useMemo(
    () => notifications.filter((n) => n.formId),
    [notifications],
  );

  const formMap = useMemo(
    () => new Map(forms.map((f) => [f.id, f])),
    [forms],
  );

  // Stats per notification
  const statsFor = (notif) => {
    const total = (notif.recipients || []).length;
    const completed = (notif.recipients || []).filter((r) =>
      formResponses.some((fr) => fr.notifId === notif.id && fr.recipientId === r.id),
    ).length;
    return { total, completed, pending: total - completed };
  };

  const responseFor = (notifId, recipientId) =>
    formResponses.find((fr) => fr.notifId === notifId && fr.recipientId === recipientId) || null;

  const copyLink = (notif, recipient) => {
    const url = `${window.location.origin}/form/${notif.formId}?nid=${notif.id}&rid=${recipient.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(`${notif.id}_${recipient.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openResponse = (notif, recipient, response) => {
    const form = formMap.get(notif.formId);
    setResponseModal({ notif, recipient, response, form });
  };

  return (
    <div>
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>Form Response Tracking</h1>
          <div className="sub">
            {tracked.length} campaign{tracked.length === 1 ? '' : 's'} with forms attached
          </div>
        </div>
      </div>

      {/* Empty state */}
      {tracked.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-chart-bar" />
          <h3>No form campaigns yet</h3>
          <p>
            Send a notification with a form link attached to start tracking responses.
          </p>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', maxWidth: 420, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>How it works:</strong> Go to{' '}
            <strong>Notifications</strong> → compose an email → click <em>Add Form</em> → send.
            Each recipient's personalised link will be trackable here.
          </div>
        </div>
      ) : (
        <div className="ft-list">
          {tracked.map((notif) => {
            const { total, completed, pending } = statsFor(notif);
            const isOpen = expandedId === notif.id;

            return (
              <div key={notif.id} className="ft-card">
                {/* Card header — click to expand */}
                <div
                  className={`ft-card-head ${isOpen ? 'is-open' : ''}`}
                  onClick={() => setExpandedId(isOpen ? null : notif.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <div className="ft-icon">
                      <i className="fa-solid fa-paper-plane" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>
                        {notif.subject || '(No subject)'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <i className="fa-solid fa-calendar" style={{ marginRight: 4 }} />
                          {fmtDate(notif.sentAt)}
                        </span>
                        <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)', fontSize: 11 }}>
                          <i className="fa-solid fa-clipboard-list" style={{ marginRight: 4 }} />
                          {notif.formName || notif.formId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Completion stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div className="ft-stat">
                      <span className="ft-stat-val" style={{ color: 'var(--status-completed)' }}>{completed}</span>
                      <span className="ft-stat-lbl">Completed</span>
                    </div>
                    <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
                    <div className="ft-stat">
                      <span className="ft-stat-val" style={{ color: 'var(--status-progress)' }}>{pending}</span>
                      <span className="ft-stat-lbl">Pending</span>
                    </div>
                    <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
                    <div className="ft-stat">
                      <span className="ft-stat-val">{total}</span>
                      <span className="ft-stat-lbl">Total</span>
                    </div>
                    <i
                      className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                      style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}
                    />
                  </div>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="ft-progress-bar">
                    <div
                      className="ft-progress-fill"
                      style={{ width: `${Math.round((completed / total) * 100)}%` }}
                    />
                  </div>
                )}

                {/* Expanded recipient table */}
                {isOpen && (
                  <div className="ft-table-wrap">
                    {(notif.recipients || []).length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                        No recipients recorded for this notification.
                      </div>
                    ) : (
                      <table className="ft-table">
                        <thead>
                          <tr>
                            <th>Recipient</th>
                            <th>Email</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th style={{ width: 120 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(notif.recipients || []).map((r) => {
                            const resp = responseFor(notif.id, r.id);
                            const isCompleted = !!resp;
                            const rm = ROLE_META[r.userType] || ROLE_META.user;
                            const copyKey = `${notif.id}_${r.id}`;
                            const justCopied = copiedId === copyKey;
                            return (
                              <tr key={r.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="user-avatar-sm" style={{ fontSize: 11 }}>
                                      {(r.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.name}</span>
                                  </div>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                                  {r.email}
                                </td>
                                <td>
                                  <span className={`type-pill ${rm.cls}`}>
                                    <i className={`fa-solid ${rm.icon}`} style={{ marginRight: 5 }} />
                                    {rm.label}
                                  </span>
                                </td>
                                <td>
                                  {isCompleted ? (
                                    <span className="ft-status completed">
                                      <i className="fa-solid fa-circle-check" /> Completed
                                    </span>
                                  ) : (
                                    <span className="ft-status pending">
                                      <i className="fa-regular fa-clock" /> Pending
                                    </span>
                                  )}
                                </td>
                                <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                                  {resp ? fmtDateTime(resp.submittedAt) : '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {isCompleted ? (
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => openResponse(notif, r, resp)}
                                        style={{ fontSize: 11 }}
                                      >
                                        <i className="fa-solid fa-eye" /> View
                                      </button>
                                    ) : (
                                      <button
                                        className={`btn btn-sm ${justCopied ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => copyLink(notif, r)}
                                        title="Copy personalised form link for this recipient"
                                        style={{ fontSize: 11 }}
                                      >
                                        <i className={`fa-solid ${justCopied ? 'fa-check' : 'fa-link'}`} />
                                        {justCopied ? 'Copied!' : 'Copy Link'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Response detail modal */}
      {responseModal && (
        <ResponseModal
          notif={responseModal.notif}
          recipient={responseModal.recipient}
          response={responseModal.response}
          form={responseModal.form}
          onClose={() => setResponseModal(null)}
        />
      )}
    </div>
  );
}

function ResponseModal({ notif, recipient, response, form, onClose }) {
  const fields = form?.fields || [];

  const getValue = (field) => {
    const raw = response.values?.[field.id];
    if (raw === undefined || raw === null || raw === '') return <em style={{ color: 'var(--muted)' }}>—</em>;
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    if (Array.isArray(raw)) return raw.join(', ') || <em style={{ color: 'var(--muted)' }}>—</em>;
    return String(raw);
  };

  const initials = (recipient.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-head">
          <div>
            <h2>Form Response</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              <i className="fa-solid fa-clipboard-list" style={{ marginRight: 5 }} />
              {form?.name || notif.formName || 'Form'} ·{' '}
              <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6, marginRight: 5 }} />
              {notif.subject}
            </div>
          </div>
          <i className="fa-solid fa-xmark close" onClick={onClose} />
        </div>

        <div className="modal-body">
          {/* Recipient info banner */}
          <div className="ft-recipient-banner">
            <div className="user-avatar-sm">{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{recipient.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{recipient.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="ft-status completed" style={{ marginBottom: 4 }}>
                <i className="fa-solid fa-circle-check" /> Completed
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : ''}
              </div>
            </div>
          </div>

          {/* Field responses */}
          {fields.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
              Form fields are no longer available (form may have been edited).
            </div>
          ) : (
            <div className="ft-response-grid">
              {fields.map((field) => (
                <div key={field.id} className="ft-response-row">
                  <div className="ft-response-label">{field.name}</div>
                  <div className="ft-response-value">{getValue(field)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
