import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { getFormById, checkFormToken } from '../api/forms.js';
import { useData } from '../store/DataContext.jsx';
import { rsStyles } from '../utils/selectStyles.js';

export default function FormView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token') || '';
  const nid            = searchParams.get('nid') || '';
  const rid            = searchParams.get('rid') || '';

  const { submitFormResponse } = useData();

  const [form, setForm]               = useState(null);
  const [tokenState, setTokenState]   = useState('checking'); // 'checking' | 'valid' | 'invalid' | 'used'
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName]   = useState('');
  const [values, setValues]           = useState({});
  const [submitted, setSubmitted]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Validate token if present
      if (token) {
        try {
          const info = await checkFormToken(token);
          if (cancelled) return;
          if (!info.isValid) { setTokenState('invalid'); return; }
          if (info.isAlreadySubmitted) { setTokenState('used'); return; }
          setRecipientEmail(info.recipientEmail || '');
          setRecipientName(info.recipientName || '');
        } catch {
          if (!cancelled) setTokenState('invalid');
          return;
        }
      } else {
        // No token — allow anonymous access (direct form URL)
        if (!cancelled) setTokenState('valid');
      }

      // 2. Load form
      try {
        const f = await getFormById(id);
        if (!cancelled) { setForm(f); setTokenState('valid'); }
      } catch {
        if (!cancelled) setTokenState('invalid');
      }
    }

    init();
    return () => { cancelled = true; };
  }, [id, token]);

  if (tokenState === 'checking') {
    return (
      <div className="public-form" style={{ textAlign: 'center', paddingTop: 60 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--brand)' }} />
      </div>
    );
  }

  if (tokenState === 'used') {
    return (
      <div className="public-form" style={{ textAlign: 'center' }}>
        <i className="fa-solid fa-lock" style={{ fontSize: 52, color: 'var(--muted)', marginBottom: 16 }} />
        <h1>Already Submitted</h1>
        <p className="lead">You have already submitted this form. Each link can only be used once.</p>
      </div>
    );
  }

  if (tokenState === 'invalid' || !form) {
    return (
      <div className="public-form">
        <h1>Form not found</h1>
        <p className="lead">This form may have been deleted or the link is invalid.</p>
        <Link className="btn btn-primary" to="/"><i className="fa-solid fa-house" /> Go home</Link>
      </div>
    );
  }

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

  const handleChange = (fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const context = {
      notifId: nid || null,
      recipientId: rid || null,
      email: recipientEmail,
      name: recipientName,
      token: token || null,
    };
    try {
      await submitFormResponse(form.id, values, context);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sorted = [...(form.fields || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));

  return (
    <form className="public-form" onSubmit={handleSubmit}>
      <h1>{form.name}</h1>
      <p className="lead">Please complete the form below.</p>

      {sorted.map((f) => (
        <FieldRenderer key={f.id} field={f} value={values[f.id]} onChange={(v) => handleChange(f.id, v)} />
      ))}

      {submitError && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: '#fee2e2', color: '#b91c1c',
          borderRadius: 8, fontSize: 13,
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
          {submitError}
        </div>
      )}

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
