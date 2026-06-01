import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../store/DataContext.jsx';

export default function FormView() {
  const { id } = useParams();
  const { forms, submitFormResponse } = useData();
  const form = forms.find((f) => f.id === id);

  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!form) {
    return (
      <div className="public-form">
        <h1>Form not found</h1>
        <p className="lead">This form may have been deleted or the link is invalid.</p>
        <Link className="btn btn-primary" to="/"><i className="fa-solid fa-house" /> Go home</Link>
      </div>
    );
  }

  const handleChange = (fieldId, value) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFormResponse(form.id, values);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="public-form" style={{ textAlign: 'center' }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: 56, color: 'var(--status-completed)', marginBottom: 16 }} />
        <h1>Thank you</h1>
        <p className="lead">Your response to <strong>{form.name}</strong> has been received.</p>
        <Link className="btn btn-primary" to="/"><i className="fa-solid fa-house" /> Return</Link>
      </div>
    );
  }

  const sorted = [...form.fields].sort((a, b) => a.sort - b.sort);

  return (
    <form className="public-form" onSubmit={handleSubmit}>
      <h1>{form.name}</h1>
      <p className="lead">Please complete the form below.</p>

      {sorted.map((f) => (
        <FieldRenderer
          key={f.id}
          field={f}
          value={values[f.id]}
          onChange={(v) => handleChange(f.id, v)}
        />
      ))}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
        <button type="submit" className="btn btn-primary">
          <i className="fa-solid fa-paper-plane" /> Submit
        </button>
      </div>
    </form>
  );
}

function FieldRenderer({ field, value, onChange }) {
  const placeholder = field.placeholder || '';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'number':
      return (
        <div className="field">
          <label>{field.name}</label>
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      );
    case 'textarea':
      return (
        <div className="field">
          <label>{field.name}</label>
          <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
      );
    case 'date':
    case 'time':
      return (
        <div className="field">
          <label>{field.name}</label>
          <input type={field.type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'select':
      return (
        <div className="field">
          <label>{field.name}</label>
          <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Select —</option>
            {(field.options || []).map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    case 'toggle':
      return (
        <div className="field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ marginBottom: 0 }}>{field.name}</label>
          <label className="toggle">
            <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      );
    case 'checkbox': {
      const selected = Array.isArray(value) ? value : [];
      const options = field.options && field.options.length > 0
        ? field.options
        : ['Yes'];
      const toggle = (opt) =>
        onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
      return (
        <div className="field">
          <label>{field.name}</label>
          <div className="check-group">
            {options.map((opt) => (
              <label key={opt}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'other':
      return (
        <div className="field">
          <label>
            {field.name}
            {field.customType && <span style={{ color: 'var(--gold-dark)', marginLeft: 6 }}>({field.customType})</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${field.customType || 'value'}`}
          />
        </div>
      );
    default:
      return null;
  }
}
