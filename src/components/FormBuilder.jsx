import { useState } from 'react';
import Select from 'react-select';
import { useAuth } from '../store/AuthContext.jsx';
import { useData } from '../store/DataContext.jsx';
import { rsStyles, toOptions } from '../utils/selectStyles.js';

const FIELD_TYPES = [
  { type: 'text', label: 'Free Text', icon: 'fa-font' },
  { type: 'textarea', label: 'Long Text', icon: 'fa-align-left' },
  { type: 'toggle', label: 'Toggle (Yes/No)', icon: 'fa-toggle-on' },
  { type: 'checkbox', label: 'Checkboxes (multi)', icon: 'fa-square-check' },
  { type: 'date', label: 'Date Picker', icon: 'fa-calendar' },
  { type: 'time', label: 'Time Picker', icon: 'fa-clock' },
  { type: 'number', label: 'Number', icon: 'fa-hashtag' },
  { type: 'email', label: 'Email', icon: 'fa-envelope' },
  { type: 'select', label: 'Dropdown', icon: 'fa-list' },
  { type: 'other', label: 'Other (Custom)', icon: 'fa-plus' },
];

const TYPES_WITH_OPTIONS = ['select', 'checkbox'];

const FIELD_TYPE_OPTS = FIELD_TYPES.map((ft) => ({
  value: ft.type,
  label: ft.label,
}));

export default function FormBuilder({ form, onClose }) {
  const { user } = useAuth();
  const { saveForm } = useData();

  const isNew = !form.id;
  const [name, setName] = useState(form.name || '');
  const [fields, setFields] = useState(form.fields || []);
  const [fieldModal, setFieldModal] = useState(null);

  const addField = (defaultType = 'text') => {
    setFieldModal({
      edit: false,
      field: {
        id: `f-${Date.now()}`,
        name: '',
        placeholder: '',
        type: defaultType,
        sort: fields.length + 1,
        options: TYPES_WITH_OPTIONS.includes(defaultType) ? ['Option 1', 'Option 2'] : undefined,
      },
    });
  };

  const editField = (f) => setFieldModal({ edit: true, field: { ...f } });

  const saveField = (field) => {
    if (fieldModal.edit) {
      setFields((prev) => prev.map((f) => (f.id === field.id ? field : f)));
    } else {
      setFields((prev) => [...prev, field]);
    }
    setFieldModal(null);
  };

  const removeField = (id) => setFields((prev) => prev.filter((f) => f.id !== id));

  const move = (id, dir) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy.map((f, i) => ({ ...f, sort: i + 1 }));
    });
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Form name is required');
    if (fields.length === 0) return alert('Add at least one field');
    const sorted = [...fields].sort((a, b) => a.sort - b.sort);
    saveForm({ id: form.id, name: name.trim(), fields: sorted, createdAt: form.createdAt, createdBy: form.createdBy }, user);
    onClose();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <button onClick={onClose} style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6, letterSpacing: '0.06em' }}>
            <i className="fa-solid fa-arrow-left" /> Back to forms
          </button>
          <h1>{isNew ? 'New Form' : 'Edit Form'}</h1>
          <div className="sub">Drag fields from the palette or click to add. Reorder with the arrows.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <i className="fa-solid fa-check" /> {isNew ? 'Save Form' : 'Update Form'}
          </button>
        </div>
      </div>

      <div className="builder">
        <aside className="builder-palette">
          <h3>Field Types</h3>
          {FIELD_TYPES.map((ft) => (
            <div key={ft.type} className="palette-item" onClick={() => addField(ft.type)} title={`Add ${ft.label}`}>
              <i className={`fa-solid ${ft.icon}`} />
              {ft.label}
            </div>
          ))}
        </aside>

        <section className="builder-canvas">
          <div className="field" style={{ marginBottom: 24 }}>
            <label>Form Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Horse Arrival Checklist" />
          </div>

          <h3 style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 12px' }}>
            Fields · {fields.length}
          </h3>

          {fields.length === 0 ? (
            <div className="empty" style={{ padding: '40px 20px' }}>
              <i className="fa-solid fa-clipboard-list" />
              <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', margin: '0 0 6px', color: 'var(--black)' }}>No fields yet</h3>
              <p style={{ margin: 0 }}>Click a field type on the left to add it.</p>
            </div>
          ) : (
            fields.map((f, i) => (
              <div className="builder-field" key={f.id}>
                <div className="meta">
                  <strong>{f.name || <em style={{ color: 'var(--muted)' }}>Untitled</em>}</strong>
                  <small>{f.type} · sort {f.sort}{f.placeholder && ` · "${f.placeholder}"`}</small>
                </div>
                <div className="actions">
                  <button onClick={() => move(f.id, -1)} disabled={i === 0} title="Move up"><i className="fa-solid fa-arrow-up" /></button>
                  <button onClick={() => move(f.id, 1)} disabled={i === fields.length - 1} title="Move down"><i className="fa-solid fa-arrow-down" /></button>
                  <button onClick={() => editField(f)} title="Edit"><i className="fa-solid fa-pen" /></button>
                  <button className="del" onClick={() => removeField(f.id)} title="Delete"><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
            ))
          )}

          <button className="btn btn-ghost" onClick={() => addField()} style={{ marginTop: 14 }}>
            <i className="fa-solid fa-plus" /> Add Field
          </button>
        </section>
      </div>

      {fieldModal && <FieldModal initial={fieldModal.field} onSave={saveField} onClose={() => setFieldModal(null)} />}
    </div>
  );
}

function FieldModal({ initial, onSave, onClose }) {
  const [field, setField] = useState(initial);
  const [optionsText, setOptionsText] = useState((initial.options || []).join('\n'));

  const update = (k, v) => {
    setField((p) => {
      const next = { ...p, [k]: v };
      if (k === 'type' && TYPES_WITH_OPTIONS.includes(v) && !optionsText.trim()) {
        setOptionsText('Option 1\nOption 2');
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!field.name.trim()) return alert('Field name is required');
    const out = { ...field };
    if (TYPES_WITH_OPTIONS.includes(out.type)) {
      out.options = optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (out.options.length === 0) return alert(`${out.type === 'select' ? 'Dropdown' : 'Checkbox group'} needs at least one option`);
    } else {
      delete out.options;
    }
    onSave(out);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{initial.id && initial.name ? 'Edit Field' : 'New Field'}</h2>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Field Name</label>
            <input type="text" value={field.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Horse Name" required />
          </div>
          <div className="field">
            <label>Placeholder</label>
            <input type="text" value={field.placeholder} onChange={(e) => update('placeholder', e.target.value)} placeholder="Hint shown in the empty field" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Field Type</label>
              <Select
                options={FIELD_TYPE_OPTS}
                value={FIELD_TYPE_OPTS.find((o) => o.value === field.type) || null}
                onChange={(opt) => update('type', opt?.value || 'text')}
                styles={rsStyles}
                menuPortalTarget={document.body}
                isSearchable={false}
              />
            </div>
            <div className="field">
              <label>Sort Number</label>
              <input type="number" value={field.sort} onChange={(e) => update('sort', Number(e.target.value) || 1)} min={1} />
            </div>
          </div>
          {TYPES_WITH_OPTIONS.includes(field.type) && (
            <div className="field">
              <label>{field.type === 'select' ? 'Dropdown options' : 'Checkbox options'} (one per line)</label>
              <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Option A&#10;Option B&#10;Option C" rows={4} />
              <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                {field.type === 'select' ? 'Users will pick exactly one option from the dropdown.' : 'Users will be able to tick any combination of these checkboxes.'}
              </small>
            </div>
          )}
          {field.type === 'other' && (
            <div className="field">
              <label>Custom Type Name</label>
              <input type="text" value={field.customType || ''} onChange={(e) => update('customType', e.target.value)} placeholder="e.g. Signature, File Upload, Rating…" />
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><i className="fa-solid fa-check" /> Save Field</button>
        </div>
      </form>
    </div>
  );
}
