import { useState, useEffect } from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { useAuth } from '../store/AuthContext.jsx';
import { useData, statusLabel } from '../store/DataContext.jsx';
import { getTicketById, addAttachment as addAttachmentApi, deleteAttachment as deleteAttachmentApi } from '../services/tickets.js';
import { post } from '../api/client.js';
import { rsStyles, toOptions } from '../utils/selectStyles.js';
import { PRIORITIES, PRIORITY_OPTS } from '../enums/tickets.js';

export default function TicketModal({ mode, ticket, onClose }) {
  const { user } = useAuth();
  const { users, agents, ticketTypes, createTicket, updateTicket, assignTicket, updateTicketStatus, addComment, showToast } = useData();

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
  const [uploadingCount, setUploadingCount] = useState(0);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploadAndAdd = async (files) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const otherFiles = files.filter((f) => !f.type.startsWith('image/'));

    if (otherFiles.length && isCreate) {
      setForm((p) => ({
        ...p,
        attachments: [...(p.attachments || []), ...otherFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }))],
      }));
    }

    if (!imageFiles.length) return;

    setUploadingCount((n) => n + imageFiles.length);
    const results = await Promise.allSettled(
      imageFiles.map(async (f) => {
        const base64Image = await fileToBase64(f);
        return post('/Upload/image', { base64Image, fileName: f.name });
      })
    );
    setUploadingCount((n) => n - imageFiles.length);

    const uploaded = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const f = imageFiles[i];
      if (r.status === 'fulfilled') {
        const raw = r.value;
        const url = typeof raw === 'string' ? raw : (raw?.imageUrl || raw?.url || raw?.fileUrl || null);
        if (!url) { showToast(`Failed to upload ${f.name}`, 'fa-triangle-exclamation'); continue; }
        if (!isCreate && ticket?.id) {
          try {
            const saved = await addAttachmentApi(ticket.id, { fileName: f.name, fileUrl: url, fileSize: f.size });
            uploaded.push({ id: saved.id, name: saved.name, url: saved.url, size: saved.size, type: f.type, createdAt: saved.createdAt });
          } catch {
            showToast(`Failed to save ${f.name}`, 'fa-triangle-exclamation');
          }
        } else {
          uploaded.push({ name: f.name, size: f.size, type: f.type, url });
        }
      } else {
        showToast(`Failed to upload ${f.name}`, 'fa-triangle-exclamation');
      }
    }

    if (uploaded.length) {
      setForm((p) => ({ ...p, attachments: [...(p.attachments || []), ...uploaded] }));
    }
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    uploadAndAdd(files);
    e.target.value = '';
  };

  const onPaste = (e) => {
    if (!isCreate && !canEditAll) return;
    const items = Array.from(e.clipboardData?.items || []);
    const images = items
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter(Boolean);
    if (images.length) { e.preventDefault(); uploadAndAdd(images); }
  };

  const removeAttachment = async (idx) => {
    const att = (form.attachments || [])[idx];
    if (!isCreate && att?.id && ticket?.id) {
      try {
        await deleteAttachmentApi(ticket.id, att.id);
      } catch {
        showToast('Failed to delete attachment', 'fa-triangle-exclamation');
        return;
      }
    }
    update('attachments', (form.attachments || []).filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { alert('Title is required'); return; }
    const payload = {
      ...form,
      dueDate: form.dueDate ? [
        form.dueDate.getFullYear(),
        String(form.dueDate.getMonth() + 1).padStart(2, '0'),
        String(form.dueDate.getDate()).padStart(2, '0'),
      ].join('-') : '',
    };
    setSubmitting(true);
    try {
      if (isCreate) {
        const created = await createTicket(payload, user);
        onClose(created);
      } else if (canEditAll) {
        const updated = await updateTicket(ticket.id, payload);
        onClose(updated);
      } else {
        onClose(null);
      }
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
      const newComment = await addComment(ticket.id, { authorId: user.id, text: commentText.trim() });
      setCommentText('');
      if (newComment) {
        setFullTicket((prev) => prev ? {
          ...prev,
          comments: [...(prev.comments || []), newComment],
          commentCount: (prev.commentCount || 0) + 1,
        } : prev);
      }
    } finally {
      setCommenting(false);
    }
  };

  const onCommentKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); handleAddComment(); }
  };

  const author = t.createdBy ? (users.find((u) => u.id === t.createdBy) || (t.createdBy === user.id ? user : null)) : null;
  const assignee = t.assignedTo ? (users.find((u) => u.id === t.assignedTo) || (t.assignedTo === user.id ? user : null)) : null;
  const isOverdue = !isCreate && t.dueDate && t.status !== 'completed' && t.status !== 'resolved' && new Date(t.dueDate) < new Date();

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()} onPaste={onPaste}>
        <div className="modal-head">
          <div>
            <h2>{isCreate ? 'Create Ticket' : t.title}</h2>
            {!isCreate && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-deep)', fontWeight: 600 }}>
                  {t.ticketNumber || t.id}
                </span>{' '}
                · Created by{' '}
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {author?.name || t.reportedByName || 'Unknown'}
                </span>
                {t.createdFrom && (
                  <>{' '}· <span style={{ color: 'var(--brand-deep)' }}>via {t.createdFrom}</span></>
                )}
                {' '}·{' '}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      <i className="fa-solid fa-paperclip" /> Add files
                      <input type="file" multiple accept="*/*" onChange={onFileChange} style={{ display: 'none' }} />
                    </label>
                    {uploadingCount > 0
                      ? <span style={{ fontSize: 11, color: 'var(--brand-deep)' }}>
                          <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 5 }} />
                          Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}…
                        </span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)' }}>or paste image anywhere</span>}
                  </div>
                  {(form.attachments || []).length > 0 && (
                    <div className="attachment-list">
                      {form.attachments.map((a, i) => {
                        const imgSrc = a.url && a.type?.startsWith('image/') ? a.url : (a.preview || null);
                        return (
                          <div className={`attachment-chip${imgSrc ? ' has-img' : ''}`} key={i}>
                            {imgSrc
                              ? <a href={imgSrc} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><img src={imgSrc} alt={a.name} className="chip-img-thumb" style={{ cursor: 'zoom-in' }} /></a>
                              : <i className="fa-solid fa-file" />}
                            {a.name}
                            <span style={{ opacity: 0.6, fontSize: 11 }}>{(a.size / 1024).toFixed(1)} KB</span>
                            <i className="fa-solid fa-xmark" onClick={() => removeAttachment(i)} />
                          </div>
                        );
                      })}
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
                      {t.attachments.map((a, i) => {
                        const imgSrc = a.url && a.type?.startsWith('image/') ? a.url : (a.preview || null);
                        return (
                          <div className={`attachment-chip${imgSrc ? ' has-img' : ''}`} key={i}>
                            {imgSrc
                              ? <a href={imgSrc} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><img src={imgSrc} alt={a.name} className="chip-img-thumb" style={{ cursor: 'zoom-in' }} /></a>
                              : <i className="fa-solid fa-file" />}
                            {a.name}
                            <span style={{ opacity: 0.6, fontSize: 11 }}>{a.size ? (a.size / 1024).toFixed(1) + ' KB' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {!isCreate && canChangeStatus && (
              <div className="field">
                <label>Status</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ v: 'open', l: 'Open' }, { v: 'progress', l: 'In Progress' }, { v: 'completed', l: 'Completed' }, { v: 'resolved', l: 'Resolved' }].map((s) => (
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

            {!isCreate && (fullTicket?.activities || []).length > 0 && (
              <ActivityLog activities={fullTicket.activities} />
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

const ACTIVITY_ICONS = {
  created: 'fa-plus-circle',
  status_changed: 'fa-arrows-rotate',
  priority_changed: 'fa-flag',
  type_changed: 'fa-tag',
  due_date_changed: 'fa-calendar',
  assigned_to_changed: 'fa-user',
};

function activityText(a) {
  const who = a.performedByName || 'Someone';
  switch (a.activityType) {
    case 'created': return `${who} created this ticket`;
    case 'status_changed': return `${who} changed status from "${a.oldValue}" to "${a.newValue}"`;
    case 'priority_changed': return `${who} changed priority from "${a.oldValue}" to "${a.newValue}"`;
    case 'type_changed': return `${who} changed type from "${a.oldValue}" to "${a.newValue}"`;
    case 'due_date_changed': return `${who} changed due date from "${a.oldValue || 'none'}" to "${a.newValue}"`;
    case 'assigned_to_changed': return `${who} reassigned from "${a.oldValue}" to "${a.newValue}"`;
    default: return `${who} updated ${a.field || 'ticket'}`;
  }
}

function ActivityLog({ activities }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
        Activity · {activities.length}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'var(--line)', borderRadius: 2 }} />
        {activities.map((a) => (
          <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 14, position: 'relative' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--brand-soft)', color: 'var(--brand-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, flexShrink: 0, zIndex: 1, border: '2px solid #fff',
            }}>
              <i className={`fa-solid ${ACTIVITY_ICONS[a.activityType] || 'fa-circle-dot'}`} />
            </div>
            <div style={{ paddingTop: 2 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{activityText(a)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
