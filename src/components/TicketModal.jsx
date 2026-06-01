import { useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function TicketModal({ mode, ticket, onClose }) {
  const { user } = useAuth();
  const {
    users,
    ticketTypes,
    createTicket,
    updateTicket,
    assignTicket,
    updateTicketStatus,
    addComment,
  } = useData();

  const isCreate = mode === 'create';
  const canAssign = user.role === 'admin';
  const canEditAll = user.role === 'admin';
  const canChangeStatus = user.role === 'admin' || (ticket && ticket.assignedTo === user.id);
  const canComment = !isCreate;

  const agents = users.filter((u) => u.role === 'agent');

  const [form, setForm] = useState(
    isCreate
      ? {
          title: '',
          description: '',
          type: ticketTypes[0] || 'Task',
          priority: 'Medium',
          assignedTo: '',
          dueDate: '',
          attachments: [],
        }
      : {
          ...ticket,
          attachments: ticket.attachments || [],
          dueDate: ticket.dueDate || '',
        }
  );
  const [commentText, setCommentText] = useState('');

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    update('attachments', [...(form.attachments || []), ...next]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    update(
      'attachments',
      (form.attachments || []).filter((_, i) => i !== idx)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    if (isCreate) {
      createTicket(form, user);
    } else if (canEditAll) {
      updateTicket(ticket.id, form);
    }
    onClose();
  };

  const handleStatus = (status) => updateTicketStatus(ticket.id, status);
  const handleAssign = (agentId) => assignTicket(ticket.id, agentId || null);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(ticket.id, { authorId: user.id, text: commentText.trim() });
    setCommentText('');
  };

  const onCommentKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleAddComment();
    }
  };

  const author = ticket && users.find((u) => u.id === ticket.createdBy);
  const assignee = ticket && users.find((u) => u.id === ticket.assignedTo);
  const isOverdue = ticket && ticket.dueDate && ticket.status !== 'completed' && new Date(ticket.dueDate) < new Date();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{isCreate ? 'Create Ticket' : ticket.title}</h2>
            {!isCreate && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-deep)', fontWeight: 600 }}>
                  {ticket.id}
                </span>{' '}
                · Created by {author?.name || 'Unknown'} ·{' '}
                {new Date(ticket.createdAt).toLocaleString()}
              </div>
            )}
          </div>
          <span className="close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!isCreate && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <span className={`badge badge-${ticket.status}`}>{statusLabel(ticket.status)}</span>
                <span className={`badge badge-pri-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand-deep)' }}>
                  {ticket.type}
                </span>
                {isOverdue && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                    <i className="fa-solid fa-clock" /> Overdue
                  </span>
                )}
              </div>
            )}

            {isCreate || canEditAll ? (
              <>
                <div className="field">
                  <label>
                    Title <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    required
                    placeholder="Brief, descriptive subject"
                  />
                </div>
                <div className="field">
                  <label>
                    Description <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="What's the situation, and what's needed?"
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                      {ticketTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Priority</label>
                    <select value={form.priority} onChange={(e) => update('priority', e.target.value)}>
                      {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate || ''}
                      onChange={(e) => update('dueDate', e.target.value)}
                    />
                  </div>
                  {(canAssign || isCreate) && (
                    <div className="field">
                      <label>Assign to Agent</label>
                      <select
                        value={form.assignedTo || ''}
                        onChange={(e) => update('assignedTo', e.target.value || null)}
                      >
                        <option value="">— Unassigned —</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
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
                          <span style={{ opacity: 0.6, fontSize: 11 }}>
                            {(a.size / 1024).toFixed(1)} KB
                          </span>
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
                  {ticket.description || <em style={{ color: 'var(--muted)' }}>No description provided.</em>}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <InfoRow label="Assignee" value={assignee?.name || 'Unassigned'} />
                  <InfoRow
                    label="Due date"
                    value={ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                  />
                </div>
                {(ticket.attachments || []).length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>
                      Attachments
                    </div>
                    <div className="attachment-list">
                      {ticket.attachments.map((a, i) => (
                        <div className="attachment-chip" key={i}>
                          <i className="fa-solid fa-file" />
                          {a.name}
                          <span style={{ opacity: 0.6, fontSize: 11 }}>
                            {(a.size / 1024).toFixed(1)} KB
                          </span>
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
                  {[
                    { v: 'open', l: 'Open' },
                    { v: 'progress', l: 'In Progress' },
                    { v: 'completed', l: 'Completed' },
                  ].map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => handleStatus(s.v)}
                      className={`btn btn-sm ${ticket.status === s.v ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isCreate && canAssign && (
              <div className="field">
                <label>Reassign</label>
                <select
                  value={ticket.assignedTo || ''}
                  onChange={(e) => handleAssign(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isCreate && (
              <div className="comments">
                <h3 style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
                  Comments · {ticket.comments.length}
                </h3>
                {ticket.comments.map((c) => {
                  const author = users.find((u) => u.id === c.authorId);
                  return (
                    <div className="comment" key={c.id}>
                      <div className="avatar">{author?.initials || '?'}</div>
                      <div className="body">
                        <div className="head">
                          <strong>{author?.name || 'Unknown'}</strong>
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
                    <button type="button" className="btn btn-gold btn-sm" onClick={handleAddComment}>
                      <i className="fa-solid fa-paper-plane" /> Post
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
              <button type="submit" className="btn btn-primary">
                <i className="fa-solid fa-check" /> {isCreate ? 'Create Ticket' : 'Save Changes'}
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
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
