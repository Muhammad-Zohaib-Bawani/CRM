import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import ImportRecipientsModal from '../components/ImportRecipientsModal.jsx';
import SelectRecipientsModal from '../components/SelectRecipientsModal.jsx';
import ImportFromExcelModal from '../components/ImportFromExcelModal.jsx';

export default function Notifications() {
  const { user } = useAuth();
  const { forms, notifications, sendNotification, showToast, loadUsers, loadContacts, contactsLoading } = useData();
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); loadContacts(); }, [loadUsers, loadContacts]);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Recipient management
  const [imported, setImported] = useState([]); // array of contacts pulled in via Import
  const [excluded, setExcluded] = useState(() => new Set()); // ids unchecked from the imported list

  const [formPickerOpen, setFormPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const activeRecipients = imported.filter((c) => !excluded.has(c.id));

  const handleImport = (picked) => {
    // Merge: keep previously imported + add new (dedupe by id). Excluded set is preserved.
    const map = new Map();
    [...imported, ...picked].forEach((c) => map.set(c.id, c));
    setImported([...map.values()]);
    showToast(`Imported ${picked.length} recipient${picked.length === 1 ? '' : 's'}`, 'fa-file-import');
  };

  const toggleExcluded = (id) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeImported = (id) => {
    setImported((prev) => prev.filter((c) => c.id !== id));
    setExcluded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearImported = () => {
    setImported([]);
    setExcluded(new Set());
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    setAttachments((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const insertFormLink = (form) => {
    const url = `${window.location.origin}/form/${form.id}`;
    const linkHtml =
      `<p><a href="${url}" target="_blank" style="display:inline-block;` +
      `padding:8px 14px;background:#eef2ff;color:#4f46e5;border-radius:6px;` +
      `font-weight:600;text-decoration:none">` +
      `📋 Open form: ${form.name}` +
      `</a></p>`;
    setBody((prev) => (prev ? prev + linkHtml : linkHtml));
    setFormPickerOpen(false);
    showToast(`Form "${form.name}" attached`, 'fa-link');
  };

  const handleSend = async () => {
    if (!subject.trim()) return alert('Subject is required');
    if (!body.trim()) return alert('Email body is required');
    if (activeRecipients.length === 0) return alert('Add at least one recipient via Import');
    setSending(true);
    try {
      await sendNotification(
        {
          subject,
          body,
          attachments,
          recipients: activeRecipients.map((c) => ({ id: c.id, name: c.name, email: c.email, userType: c.userType })),
        },
        user,
        activeRecipients.length
      );
      setSubject('');
      setBody('');
      setAttachments([]);
      setImported([]);
      setExcluded(new Set());
    } catch {
      // error toast shown by DataContext
    } finally {
      setSending(false);
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-lock" />
        <h3>Admin only</h3>
        <p>The Notifications module is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <div className="sub">
            Import recipients, compose your broadcast, send ·{' '}
            <strong style={{ color: 'var(--brand-deep)' }}>{notifications.length}</strong>{' '}
            sent in total
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/notification-history')}>
          <i className="fa-solid fa-clock-rotate-left" /> History
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="field">
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
            />
          </div>

          <div className="field">
            <label>Message</label>
            <RichTextEditor value={body} onChange={setBody} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              <i className="fa-solid fa-paperclip" /> Add files
              <input type="file" multiple onChange={onFileChange} style={{ display: 'none' }} />
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFormPickerOpen(true)}
              disabled={forms.length === 0}
              title={forms.length === 0 ? 'No active forms — build one first' : 'Insert a form link into the email'}
            >
              <i className="fa-solid fa-clipboard-list" /> Add Form
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="field">
              <label>Attachments</label>
              <div className="attachment-list">
                {attachments.map((a, i) => (
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
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              <i className="fa-solid fa-users" /> Sending to{' '}
              <strong style={{ color: 'var(--brand-deep)' }}>{activeRecipients.length}</strong>{' '}
              recipient{activeRecipients.length === 1 ? '' : 's'}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || activeRecipients.length === 0}
              title={activeRecipients.length === 0 ? 'Import recipients first' : ''}
            >
              {sending
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</>
                : <><i className="fa-solid fa-paper-plane" /> Send Notification</>}
            </button>
          </div>
        </div>

        {/* ===================== RECIPIENTS SIDEBAR ===================== */}
        <RecipientsSidebar
          imported={imported}
          excluded={excluded}
          onOpenSelect={() => setSelectOpen(true)}
          onOpenImport={() => setImportOpen(true)}
          onOpenExcel={() => setExcelOpen(true)}
          onToggle={toggleExcluded}
          onRemove={removeImported}
          onClear={clearImported}
        />
      </div>

      {selectOpen && (
        <SelectRecipientsModal
          currentlyImported={imported}
          onImport={handleImport}
          onClose={() => setSelectOpen(false)}
        />
      )}

      {importOpen && (
        <ImportRecipientsModal
          currentlyImported={imported}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {excelOpen && (
        <ImportFromExcelModal
          onImport={handleImport}
          onClose={() => setExcelOpen(false)}
        />
      )}

      {formPickerOpen && (
        <FormPicker forms={forms} onPick={insertFormLink} onClose={() => setFormPickerOpen(false)} />
      )}

    </div>
  );
}

function RecipientsSidebar({ imported, excluded, onOpenSelect, onOpenImport, onOpenExcel, onToggle, onRemove, onClear }) {
  const active = imported.filter((c) => !excluded.has(c.id));
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = search.trim()
    ? imported.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : imported;

  const openOption = (fn) => { setMenuOpen(false); fn(); };

  return (
    <div className="card recipients-card">
      <div className="recipients-head">
        <h3>
          <i className="fa-solid fa-user-group" /> Recipients
        </h3>
        {imported.length > 0 && (
          <span className="recipients-summary">
            <strong>{active.length}</strong> / {imported.length} selected
          </span>
        )}
      </div>

      {/* 3-option dropdown button */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setMenuOpen((v) => !v)}
          style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px' }}
        >
          <span><i className="fa-solid fa-user-plus" style={{ marginRight: 8 }} />
            {imported.length === 0 ? 'Add Recipients' : 'Add More'}
          </span>
          <i className={`fa-solid fa-chevron-${menuOpen ? 'up' : 'down'}`} style={{ fontSize: 11 }} />
        </button>

        {menuOpen && (
          <div className="recipient-dropdown">
            <button className="recipient-dropdown-item" onClick={() => openOption(onOpenSelect)}>
              <span className="rdi-icon"><i className="fa-solid fa-users" /></span>
              <div>
                <div className="rdi-label">Select Recipients</div>
                <div className="rdi-sub">Pick from local system users</div>
              </div>
            </button>
            <button className="recipient-dropdown-item" onClick={() => openOption(onOpenImport)}>
              <span className="rdi-icon"><i className="fa-solid fa-filter" /></span>
              <div>
                <div className="rdi-label">Import Recipients</div>
                <div className="rdi-sub">Filter & import from the contact pool</div>
              </div>
            </button>
            <button className="recipient-dropdown-item" onClick={() => openOption(onOpenExcel)}>
              <span className="rdi-icon"><i className="fa-solid fa-file-excel" /></span>
              <div>
                <div className="rdi-label">Import from Excel</div>
                <div className="rdi-sub">Upload .xlsx, .xls or .csv file</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {imported.length === 0 ? (
        <div className="recipients-empty">
          <i className="fa-solid fa-inbox" />
          <p>No recipients yet.</p>
          <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
            Click <strong>Import Recipients</strong> to pick contacts from the pool.
          </p>
        </div>
      ) : (
        <>
          <div className="search" style={{ marginTop: 12, position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 12 }} />
            <input
              type="text"
              placeholder="Filter recipients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                background: '#fafafa',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          <div className="recipients-list">
            {visible.map((c) => {
              const isActive = !excluded.has(c.id);
              return (
                <label key={c.id} className={`recipient-row ${isActive ? 'is-active' : 'is-excluded'}`}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => onToggle(c.id)}
                  />
                  <span className="mini-avatar">{c.initials || c.name[0]}</span>
                  <span className="info">
                    <span className="name">{c.name}</span>
                    <span className="email">{c.email}</span>
                  </span>
                  <span className={`type-pill type-${c.userType.toLowerCase()}`}>{c.userType}</span>
                  <button
                    type="button"
                    className="remove"
                    onClick={(e) => { e.preventDefault(); onRemove(c.id); }}
                    title="Remove from list"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClear}
            style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
          >
            <i className="fa-solid fa-trash" /> Clear list
          </button>
        </>
      )}
    </div>
  );
}

function FormPicker({ forms, onPick, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Attach a Form</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Choose an active form to insert as a clickable link in your email.
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>
        <div className="modal-body">
          {forms.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <i className="fa-solid fa-clipboard-list" />
              <h3>No active forms</h3>
              <p>Build a form in the Dynamic Forms module first.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {forms.map((f) => (
                <button key={f.id} type="button" className="form-pick-row" onClick={() => onPick(f)}>
                  <div className="icon-wrap"><i className="fa-solid fa-clipboard-list" /></div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, letterSpacing: '0.04em' }}>
                      {f.fields.length} field{f.fields.length === 1 ? '' : 's'} · created {new Date(f.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>
                    <i className="fa-solid fa-plus" /> Insert
                  </span>
                </button>
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
