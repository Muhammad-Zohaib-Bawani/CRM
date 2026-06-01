import { useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import FormBuilder from '../components/FormBuilder.jsx';

export default function Forms() {
  const { user } = useAuth();
  const { forms, deleteForm, showToast } = useData();

  const [editingForm, setEditingForm] = useState(null); // form object or {} for new

  if (user.role !== 'admin') {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-lock" />
        <h3>Admin only</h3>
        <p>The Dynamic Forms module is restricted to administrators.</p>
      </div>
    );
  }

  const copyLink = (form) => {
    const url = `${window.location.origin}${window.location.pathname}#/form/${form.id}`;
    try {
      navigator.clipboard.writeText(url);
      showToast('Form link copied to clipboard', 'fa-link');
    } catch {
      prompt('Copy this form link:', url);
    }
  };

  if (editingForm !== null) {
    return <FormBuilder form={editingForm} onClose={() => setEditingForm(null)} />;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dynamic Forms</h1>
          <div className="sub">{forms.length} form{forms.length === 1 ? '' : 's'} · attachable via email link</div>
        </div>
        <button className="btn btn-gold" onClick={() => setEditingForm({})}>
          <i className="fa-solid fa-plus" /> New Form
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-clipboard-list" />
          <h3>No forms yet</h3>
          <p>Build your first form and share it via a notification email link.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {forms.map((f) => (
            <div className="card" key={f.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, margin: 0, color: 'var(--black)' }}>
                    {f.name}
                  </h3>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.04em' }}>
                    {f.fields.length} field{f.fields.length === 1 ? '' : 's'} · created {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <i className="fa-solid fa-clipboard-list" style={{ color: 'var(--gold)', fontSize: 22 }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                {f.fields.slice(0, 6).map((field) => (
                  <span
                    key={field.id}
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: 'var(--gold-tint)',
                      color: 'var(--gold-dark)',
                      borderRadius: 100,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {field.type}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingForm(f)}>
                  <i className="fa-solid fa-pen" /> Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => copyLink(f)}>
                  <i className="fa-solid fa-link" /> Copy link
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={`${window.location.pathname}#/form/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="fa-solid fa-up-right-from-square" /> Preview
                </a>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm(`Delete form "${f.name}"?`)) deleteForm(f.id);
                  }}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
