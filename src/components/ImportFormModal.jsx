import { useState } from 'react';

const THIRD_PARTY_FORMS = [
  { id: 'tp-1', name: 'Horse Registration — FEI Standard', source: 'FEI Portal', fields: 12 },
  { id: 'tp-2', name: 'Owner Identity Verification', source: 'GCAT Registry', fields: 8 },
  { id: 'tp-3', name: 'Veterinary Health Certificate', source: 'UAE Equestrian Federation', fields: 15 },
  { id: 'tp-4', name: 'Stable Entry Permit Request', source: 'Monaco Equestrian Club', fields: 6 },
];

export default function ImportFormModal({ onClose, onImport }) {
  const [selected, setSelected] = useState(null);

  const handleImport = () => {
    if (!selected) return;
    onImport({ name: selected.name, source: selected.source });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Import Form</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Select a form from the list below to import it into your workspace.
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {THIRD_PARTY_FORMS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`import-form-row ${selected?.id === f.id ? 'selected' : ''}`}
                onClick={() => setSelected(f)}
              >
                <div className="icon-wrap">
                  <i className="fa-solid fa-clipboard-list" />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {f.fields} fields · Source: {f.source}
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', border: '2px solid',
                  borderColor: selected?.id === f.id ? 'var(--brand)' : 'var(--line)',
                  background: selected?.id === f.id ? 'var(--brand)' : '#fff',
                  display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.15s',
                }}>
                  {selected?.id === f.id && (
                    <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 9 }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!selected}
          >
            <i className="fa-solid fa-file-import" /> Import Form
          </button>
        </div>
      </div>
    </div>
  );
}
