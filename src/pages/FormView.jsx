import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { getFormById } from '../api/forms.js';
import { useData } from '../store/DataContext.jsx';
import { rsStyles } from '../utils/selectStyles.js';

export default function FormView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const nid = searchParams.get('nid');
  const rid = searchParams.get('rid');
  const { submitFormResponse } = useData();

  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFormById(id).then(setForm).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="public-form">
        <h1>Form not found</h1>
        <p className="lead">This form may have been deleted or the link is invalid.</p>
        <Link className="btn btn-primary" to="/"><i className="fa-solid fa-house" /> Go home</Link>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="public-form" style={{ textAlign: 'center', paddingTop: 60 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--brand)' }} />
      </div>
    );
  }

  const handleChange = (fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const context = nid && rid ? { notifId: nid, recipientId: rid } : null;
    try {
      await submitFormResponse(form.id, values, context);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
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

  const sorted = [...(form.fields || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));

  return (
    <form className="public-form" onSubmit={handleSubmit}>
      <h1>{form.name}</h1>
      <p className="lead">Please complete the form below.</p>

      {sorted.map((f) => (
        <FieldRenderer key={f.id} field={f} value={values[f.id]} onChange={(v) => handleChange(f.id, v)} />
      ))}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</>
            : <><i className="fa-solid fa-paper-plane" /> Submit</>}
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
          <input type={field.type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
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
      return (
        <div className="field">
          <label>{field.name}</label>
          <DatePicker
            selected={value ? new Date(value) : null}
            onChange={(d) => onChange(d ? d.toISOString().split('T')[0] : '')}
            dateFormat="dd MMM yyyy"
            placeholderText={placeholder || 'Select a date'}
            isClearable
          />
        </div>
      );

    case 'time':
      return (
        <div className="field">
          <label>{field.name}</label>
          <DatePicker
            selected={value ? new Date(`2000-01-01T${value}`) : null}
            onChange={(d) => onChange(d ? d.toTimeString().slice(0, 5) : '')}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="HH:mm"
            placeholderText={placeholder || 'Select a time'}
            isClearable
          />
        </div>
      );

    case 'select': {
      const opts = (field.options || []).map((o) => ({ value: o, label: o }));
      return (
        <div className="field">
          <label>{field.name}</label>
          <Select
            options={opts}
            value={opts.find((o) => o.value === value) || null}
            onChange={(opt) => onChange(opt?.value || '')}
            placeholder="— Select —"
            isClearable
            styles={rsStyles}
          />
        </div>
      );
    }

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
      const options = field.options?.length ? field.options : ['Yes'];
      const toggle = (opt) => onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
      return (
        <div className="field">
          <label>{field.name}</label>
          <div className="check-group">
            {options.map((opt) => (
              <label key={opt}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="field">
          <label>{field.name}</label>
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
      );
  }
}
