import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getFormCampaigns, getFormResponses, getFormResponsesByCampaign, exportFormResponsesByCampaign } from '../services/forms.js';

const ROLE_META = {
  admin:         { label: 'Admin',        cls: 'type-admin',   icon: 'fa-crown'     },
  agent:         { label: 'Agent',        cls: 'type-agent',   icon: 'fa-headset'   },
  user:          { label: 'General User', cls: 'type-user',    icon: 'fa-user'      },
  Admin:         { label: 'Admin',        cls: 'type-admin',   icon: 'fa-crown'     },
  Agent:         { label: 'Agent',        cls: 'type-agent',   icon: 'fa-headset'   },
  'General User':{ label: 'General User', cls: 'type-user',    icon: 'fa-user'      },
  Manager:       { label: 'Manager',      cls: 'type-manager', icon: 'fa-briefcase' },
  Owner:         { label: 'Owner',        cls: 'type-owner',   icon: 'fa-star'      },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function SkeletonCampaignCard() {
  return (
    <div className="ft-card">
      <div className="ft-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton" style={{ width: '50%', height: 15, display: 'block', marginBottom: 8 }} />
            <span className="skeleton" style={{ width: '30%', height: 12 }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span className="skeleton" style={{ width: 60, height: 36, borderRadius: 8 }} />
          <span className="skeleton" style={{ width: 60, height: 36, borderRadius: 8 }} />
          <span className="skeleton" style={{ width: 60, height: 36, borderRadius: 8 }} />
        </div>
      </div>
      <div className="ft-progress-bar">
        <div className="skeleton" style={{ width: '40%', height: '100%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function SkeletonRecipientRows() {
  return Array.from({ length: 3 }).map((_, i) => (
    <tr key={i} style={{ pointerEvents: 'none' }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
          <span className="skeleton" style={{ width: 120, height: 13 }} />
        </div>
      </td>
      <td><span className="skeleton" style={{ width: 160, height: 12 }} /></td>
      <td><span className="skeleton" style={{ width: 70, height: 22, borderRadius: 20 }} /></td>
      <td><span className="skeleton" style={{ width: 80, height: 22, borderRadius: 20 }} /></td>
      <td><span className="skeleton" style={{ width: 90, height: 12 }} /></td>
      <td><span className="skeleton" style={{ width: 90, height: 28, borderRadius: 6 }} /></td>
    </tr>
  ));
}

export default function FormTracking() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getFormCampaigns();
        if (!cancelled) setCampaigns(data);
      } catch (err) {
        console.error('Failed to load form campaigns:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const [expandedId, setExpandedId]       = useState(null);
  const [responseModal, setResponseModal] = useState(null);
  const [allResponsesModal, setAllResponsesModal] = useState(null); // { notif, form }
  const [copiedId, setCopiedId]           = useState(null);

  // ── API responses per formId ──────────────────────────────────────────────
  const [apiResponses, setApiResponses] = useState({});   // { formId: [...] }
  const [loadingForms, setLoadingForms] = useState(new Set());
  const loadedRef = useRef(new Set());

  const loadApiResponses = useCallback(async (formId, { force = false } = {}) => {
    if (!formId) return;
    if (!force && loadedRef.current.has(formId)) return;
    loadedRef.current.add(formId);
    setLoadingForms((prev) => { const s = new Set(prev); s.add(formId); return s; });
    try {
      const data = await getFormResponses(formId);
      setApiResponses((prev) => ({ ...prev, [formId]: data }));
    } catch (err) {
      console.error('Failed to load form responses:', err);
      loadedRef.current.delete(formId);
    } finally {
      setLoadingForms((prev) => { const s = new Set(prev); s.delete(formId); return s; });
    }
  }, []);

  // Load responses for all campaigns on mount / when campaigns list changes
  useEffect(() => {
    campaigns.forEach((n) => { if (n.formId) loadApiResponses(n.formId); });
  }, [campaigns, loadApiResponses]);

  // When a card is expanded, load its responses. Force-refresh if any recipient
  // is already marked submitted (so "View Response" has real data)
  useEffect(() => {
    if (!expandedId) return;
    const notif = campaigns.find((n) => n.id === expandedId);
    if (!notif?.formId) return;
    const hasSubmitted = (notif.recipients || []).some((r) => r.isFormSubmitted);
    loadApiResponses(notif.formId, { force: hasSubmitted });
  }, [expandedId, campaigns, loadApiResponses]);

  // ── Response lookup helpers ───────────────────────────────────────────────

  const getApiResponseFor = useCallback((notif, recipient) => {
    const list = apiResponses[notif.formId] || [];
    const byId = list.find((r) => r.recipientId === recipient.id);
    if (byId) return byId;
    if (!recipient.email) return null;
    return list.find(
      (r) => r.submittedByEmail?.toLowerCase() === recipient.email.toLowerCase(),
    ) || null;
  }, [apiResponses]);

  const responseFor = useCallback((notif, recipient) => {
    // 1. Real API response — has actual field values
    const api = getApiResponseFor(notif, recipient);
    if (api) return { source: 'api', data: api };

    // 2. isFormSubmitted flag set by backend after token-based submission
    if (recipient.isFormSubmitted) {
      return { source: 'flag', data: { submittedAt: recipient.formSubmittedAt, values: [] } };
    }

    return null;
  }, [getApiResponseFor]);

  const statsFor = useCallback((notif) => {
    const total = (notif.recipients || []).length;
    const completed = (notif.recipients || []).filter(
      (r) => !!responseFor(notif, r),
    ).length;
    return { total, completed, pending: total - completed };
  }, [responseFor]);

  const copyLink = (notif, recipient) => {
    const params = new URLSearchParams({ nid: notif.id, rid: recipient.id });
    if (recipient.submissionToken) params.set('token', recipient.submissionToken);
    const url = `${window.location.origin}/form/${notif.formId}?${params}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(`${notif.id}_${recipient.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openResponse = (notif, recipient, resp) => {
    setResponseModal({ notif, recipient, resp, form: notif.form });
  };

  const openAllResponses = (e, notif) => {
    e.stopPropagation();
    setAllResponsesModal({ notif, form: notif.form });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Form Response Tracking</h1>
          <div className="sub">
            {loading
              ? 'Loading…'
              : `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'} with forms attached`}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ft-list">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCampaignCard key={i} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-chart-bar" />
          <h3>No form campaigns yet</h3>
          <p>Send a notification with a form link attached to start tracking responses.</p>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', maxWidth: 420, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>How it works:</strong> Go to{' '}
            <strong>Notifications</strong> → compose an email → click <em>Add Form</em> → send.
            Each recipient's personalised link will be trackable here.
          </div>
        </div>
      ) : (
        <div className="ft-list">
          {campaigns.map((notif) => {
            const { total, completed, pending } = statsFor(notif);
            const isOpen = expandedId === notif.id;
            const isLoadingResponses = loadingForms.has(notif.formId);

            return (
              <div key={notif.id} className="ft-card">
                {/* Card header */}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isLoadingResponses && (
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 13, color: 'var(--muted)', marginRight: 4 }} />
                    )}
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
                    <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => openAllResponses(e, notif)}
                      title="View all responses"
                      style={{ fontSize: 13, padding: '4px 8px' }}
                    >
                      <i className="fa-solid fa-table-list" />
                    </button>
                    <i
                      className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                      style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}
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
                          {isLoadingResponses ? (
                            <SkeletonRecipientRows />
                          ) : (
                            (notif.recipients || []).map((r) => {
                              const resp = responseFor(notif, r);
                              const isCompleted = !!resp;
                              const rm = ROLE_META[r.userType] || ROLE_META.user;
                              const copyKey = `${notif.id}_${r.id}`;
                              const justCopied = copiedId === copyKey;
                              const submittedAt = resp?.data?.submittedAt ?? resp?.data?.formSubmittedAt ?? null;

                              return (
                                <tr key={r.id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div
                                        className="user-avatar-sm"
                                        style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
                                      >
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
                                    {submittedAt ? fmtDateTime(submittedAt) : '—'}
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
                                          title="Copy personalised form link"
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
                            })
                          )}
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

      {responseModal && (
        <ResponseModal
          notif={responseModal.notif}
          recipient={responseModal.recipient}
          resp={responseModal.resp}
          form={responseModal.form}
          onClose={() => setResponseModal(null)}
        />
      )}

      {allResponsesModal && (
        <AllResponsesModal
          notif={allResponsesModal.notif}
          form={allResponsesModal.form}
          onClose={() => setAllResponsesModal(null)}
        />
      )}
    </div>
  );
}

// ── All responses listing modal ───────────────────────────────────────────────

function AllResponsesModal({ notif, form, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!notif.formCampaignId) { setLoading(false); return; }
    let cancelled = false;
    getFormResponsesByCampaign(notif.formCampaignId)
      .then((data) => { if (!cancelled) setResponses(data); })
      .catch((err) => console.error('Failed to load campaign responses:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notif.formCampaignId]);

  const fieldLabels = useMemo(() => {
    if (form?.fields?.length) {
      return form.fields
        .slice()
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map((f) => f.name);
    }
    const seen = new Set();
    responses.forEach((r) => (r.values || []).forEach((v) => seen.add(v.fieldLabel)));
    return [...seen];
  }, [form, responses]);

  const handleExport = async () => {
    if (!notif.formCampaignId) return;
    setExporting(true);
    try {
      const { blob, fileName } = await exportFormResponsesByCampaign(notif.formCampaignId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" style={{ maxWidth: 900, width: '95vw' }}>
        <div className="modal-head">
          <div>
            <h2>All Responses</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              <i className="fa-solid fa-clipboard-list" style={{ marginRight: 5 }} />
              {form?.name || notif.formName || 'Form'} ·{' '}
              <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6, marginRight: 5 }} />
              {notif.subject}
            </div>
          </div>
          <i className="fa-solid fa-xmark close" onClick={onClose} />
        </div>

        <div className="modal-body" style={{ padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
          {!notif.formCampaignId ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: 28, display: 'block', marginBottom: 12 }} />
              Campaign tracking is only available for notifications sent after this feature was enabled.
            </div>
          ) : loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color: 'var(--brand)' }} />
            </div>
          ) : responses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 12 }} />
              No responses submitted yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ft-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Submitted By</th>
                    <th>Email</th>
                    <th>Submitted At</th>
                    {fieldLabels.map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.submittedByName || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{r.submittedByEmail || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDateTime(r.submittedAt)}</td>
                      {fieldLabels.map((label) => {
                        const val = (r.values || []).find((v) => v.fieldLabel === label);
                        return (
                          <td key={label} style={{ fontSize: 13 }}>
                            {val?.value || <em style={{ color: 'var(--muted)' }}>—</em>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting || responses.length === 0}
          >
            {exporting
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> Exporting…</>
              : <><i className="fa-solid fa-file-excel" /> Export to Excel</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Response detail modal ─────────────────────────────────────────────────────

function ResponseModal({ notif, recipient, resp, form, onClose }) {
  const { source, data } = resp;

  const displayValues = useMemo(() => {
    if (source === 'api') {
      return (data.values || []).map((v) => ({ label: v.fieldLabel, value: v.value }));
    }
    // 'flag' source — submission confirmed but response data not yet loaded
    return [];
  }, [source, data]);

  const renderValue = (raw) => {
    if (raw === undefined || raw === null || raw === '') return <em style={{ color: 'var(--muted)' }}>—</em>;
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    if (Array.isArray(raw)) return raw.join(', ') || <em style={{ color: 'var(--muted)' }}>—</em>;
    return String(raw);
  };

  const initials = (recipient.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const submittedAt = source === 'api' ? data.submittedAt : data?.submittedAt;

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
              {source === 'api' && (
                <span style={{
                  marginLeft: 10, fontSize: 10, background: '#dcfce7', color: '#15803d',
                  padding: '2px 7px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.04em',
                }}>
                  LIVE
                </span>
              )}
            </div>
          </div>
          <i className="fa-solid fa-xmark close" onClick={onClose} />
        </div>

        <div className="modal-body">
          <div className="ft-recipient-banner">
            <div className="user-avatar-sm" style={{ width: 36, height: 36, fontSize: 13 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{recipient.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{recipient.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="ft-status completed" style={{ marginBottom: 4 }}>
                <i className="fa-solid fa-circle-check" /> Completed
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {submittedAt ? new Date(submittedAt).toLocaleString() : ''}
              </div>
            </div>
          </div>

          {displayValues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
              No response data available.
            </div>
          ) : (
            <div className="ft-response-grid">
              {displayValues.map((item, i) => (
                <div key={i} className="ft-response-row">
                  <div className="ft-response-label">{item.label}</div>
                  <div className="ft-response-value">{renderValue(item.value)}</div>
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
