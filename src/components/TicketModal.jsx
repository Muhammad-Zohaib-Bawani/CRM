import { useState, useEffect } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import { getTicketById } from '../api/tickets.js';
import { rsStyles, toOptions } from '../utils/selectStyles.js';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PRIORITY_OPTS = toOptions(PRIORITIES);

export default function TicketModal({ mode, ticket, onClose }) {
  const { user } = useAuth();
  const { users, agents, ticketTypes, createTicket, updateTicket, assignTicket, updateTicketStatus, addComment } = useData();

  // Fetch full detail (with comments) when viewing an existing ticket
  const [fullTicket, setFullTicket] = useState(ticket);
  useEffect(() => {
    if (mode !== 'create' && ticket?.id) {
      getTicketById(ticket.id).then(setFullTicket).catch(() => setFullTicket(ticket));
    }
  }, [mode, ticket?.id]);
  const activeTicket = mode === 'create' ? null : fullTicket;
  const t = activeTicket || ticket || {};

  const isCreate = mode === 'create';
  const canAssign = user.role === 'admin';
  const canEditAll = user.role === 'admin';
  const canChangeStatus = user.role === 'admin' || (t && t.assignedTo === user.id);
  const canComment = !isCreate;

  // agents comes directly from DataContext (fetched from /users/agents endpoint)
  const typeOpts = toOptions(ticketTypes);
  const agentOpts = [
    { value: '', label: '— Unassigned —' },
    ...agents.map((a) => ({ value: a.id, label: a.name })),
  ];

  const [form, setForm] = useState(
    isCreate
      ? { title: '', description: '', type: ticketTypes[0] || 'Task', priority: 'Medium', assignedTo: '', dueDate: null, attachments: [] }
      : { ...ticket, attachments: ticket.attachments || [], dueDate: ticket.dueDate ? new Date(ticket.dueDate + 'T00:00:00') : null }
  );
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [commenting, setCommenting] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    update('attachments', [...(form.attachments || []), ...files.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => update('attachments', (form.attachments || []).filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { alert('Title is required'); return; }
    const payload = {
      ...form,
      dueDate: form.dueDate ? form.dueDate.toISOString().split('T')[0] : '',
    };
    setSubmitting(true);
    try {
      if (isCreate) await createTicket(payload, user);
      else if (canEditAll) await updateTicket(ticket.id, payload);
      onClose();
    } catch {
      // error already shown via toast in DataContext — keep modal open
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = (status) => updateTicketStatus(ticket.id, status);

  const handleAssign = async (opt) => {
    setAssigning(true);
    try { await assignTicket(ticket.id, opt?.value || null); }
    finally { setAssigning(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await addComment(ticket.id, { authorId: user.id, text: commentText.trim() });
      setCommentText('');
    } finally {
      setCommenting(false);
    }
  };

  const onCommentKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); handleAddComment(); }
  };

  const author = t.createdBy ? users.find((u) => u.id === t.createdBy) : null;
  const assignee = t.assignedTo ? users.find((u) => u.id === t.assignedTo) : null;
  const isOverdue = !isCreate && t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < new Date();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{isCreate ? 'Create Ticket' : t.title}</h2>
            {!isCreate && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-deep)', fontWeight: 600 }}>
                  {t.ticketNumber || t.id}
                </span>{' '}
                · Created by {author?.name || t.reportedByName || 'Unknown'} ·{' '}
                {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
              </div>
            )}
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!isCreate && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span>
                <span className={`badge badge-pri-${(t.priority || 'medium').toLowerCase()}`}>{t.priority}</span>
                <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>{t.type}</span>
                {isOverdue && <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="fa-solid fa-clock" /> Overdue</span>}
              </div>
            )}

            {isCreate || canEditAll ? (
              <>
                <div className="field">
                  <label>Title <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} required placeholder="Brief, descriptive subject" />
                </div>
                <div className="field">
                  <label>Description <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What's the situation, and what's needed?" />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>Type</label>
                    <Select
                      options={typeOpts}
                      value={typeOpts.find((o) => o.value === form.type) || null}
                      onChange={(opt) => update('type', opt?.value || ticketTypes[0])}
                      styles={rsStyles}
                      menuPortalTarget={document.body}
                      isSearchable={false}
                    />
                  </div>
                  <div className="field">
                    <label>Priority</label>
                    <Select
                      options={PRIORITY_OPTS}
                      value={PRIORITY_OPTS.find((o) => o.value === form.priority) || null}
                      onChange={(opt) => update('priority', opt?.value || 'Medium')}
                      styles={rsStyles}
                      menuPortalTarget={document.body}
                      isSearchable={false}
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>Due Date</label>
                    <DatePicker
                      selected={form.dueDate}
                      onChange={(d) => update('dueDate', d)}
                      dateFormat="dd MMM yyyy"
                      placeholderText="Pick a due date"
                      isClearable
                      minDate={new Date()}
                    />
                  </div>
                  {(canAssign || isCreate) && (
                    <div className="field">
                      <label>Assign to Agent</label>
                      <Select
                        options={agentOpts}
                        value={agentOpts.find((o) => o.value === (form.assignedTo || '')) || agentOpts[0]}
                        onChange={(opt) => update('assignedTo', opt?.value || '')}
                        styles={rsStyles}
                        menuPortalTarget={document.body}
                      />
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Attachments</label>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    <i className="fa-solid fa-paperclip" /> Add files
                    <input type="file" multiple onChange={onFileChange} style={{ display: 'none' }} />
                  </label>
                  {(form.attachments || []).length > 0 && (
                    <div className="attachment-list">
                      {form.attachments.map((a, i) => (
                        <div className="attachment-chip" key={i}>
                          <i className="fa-solid fa-file" />
                          {a.name}
                          <span style={{ opacity: 0.6, fontSize: 11 }}>{(a.size / 1024).toFixed(1)} KB</span>
                          <i className="fa-solid fa-xmark" onClick={() => removeAttachment(i)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink)', marginBottom: 18 }}>
                  {t.description || <em style={{ color: 'var(--muted)' }}>No description provided.</em>}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <InfoRow label="Assignee" value={assignee?.name || t.assignedToName || 'Unassigned'} />
                  <InfoRow label="Due date" value={t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'} />
                </div>
                {(t.attachments || []).length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Attachments</div>
                    <div className="attachment-list">
                      {t.attachments.map((a, i) => (
                        <div className="attachment-chip" key={i}>
                          <i className="fa-solid fa-file" />
                          {a.name}
                          <span style={{ opacity: 0.6, fontSize: 11 }}>{a.size ? (a.size / 1024).toFixed(1) + ' KB' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!isCreate && canChangeStatus && (
              <div className="field">
                <label>Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'open', l: 'Open' }, { v: 'progress', l: 'In Progress' }, { v: 'completed', l: 'Completed' }].map((s) => (
                    <button key={s.v} type="button" onClick={() => handleStatus(s.v)} className={`btn btn-sm ${t.status === s.v ? 'btn-primary' : 'btn-ghost'}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isCreate && canAssign && (
              <div className="field">
                <label>
                  Reassign
                  {assigning && <i className="fa-solid fa-circle-notch fa-spin" style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }} />}
                </label>
                <Select
                  options={agentOpts}
                  value={agentOpts.find((o) => o.value === (t.assignedTo || '')) || agentOpts[0]}
                  onChange={handleAssign}
                  styles={rsStyles}
                  menuPortalTarget={document.body}
                  isDisabled={assigning}
                />
              </div>
            )}

            {!isCreate && (
              <div className="comments">
                <h3 style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
                  Comments · {(t.comments || []).length}
                </h3>
                {(t.comments || []).map((c) => {
                  const cAuthor = users.find((u) => u.id === c.authorId);
                  return (
                    <div className="comment" key={c.id}>
                      <div className="avatar">{cAuthor?.initials || c.userName?.[0] || '?'}</div>
                      <div className="body">
                        <div className="head">
                          <strong>{cAuthor?.name || c.userName || 'Unknown'}</strong>
                          <span className="time">{new Date(c.at).toLocaleString()}</span>
                        </div>
                        <div className="text">{c.text}</div>
                      </div>
                    </div>
                  );
                })}
                {canComment && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={onCommentKey}
                      placeholder="Add a comment…"
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: '#fafafa' }}
                    />
                    <button
                      type="button"
                      className="btn btn-gold btn-sm"
                      onClick={handleAddComment}
                      disabled={commenting || !commentText.trim()}
                    >
                      {commenting
                        ? <><i className="fa-solid fa-circle-notch fa-spin" /> Posting…</>
                        : <><i className="fa-solid fa-paper-plane" /> Post</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {isCreate || canEditAll ? 'Cancel' : 'Close'}
            </button>
            {(isCreate || canEditAll) && (
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</>
                  : <><i className="fa-solid fa-check" /> {isCreate ? 'Create Ticket' : 'Save Changes'}</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
