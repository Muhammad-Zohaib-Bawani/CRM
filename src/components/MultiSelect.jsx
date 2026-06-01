import { useEffect, useRef, useState } from 'react';

export default function MultiSelect({ label, placeholder, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange(options.map((o) => o.value));

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const summary = () => {
    if (selected.length === 0) return <span className="placeholder">{placeholder || 'Any'}</span>;
    if (selected.length === 1) {
      const o = options.find((x) => x.value === selected[0]);
      return <span>{o ? o.label : selected[0]}</span>;
    }
    return (
      <>
        <span>{selected.length} selected</span>
      </>
    );
  };

  return (
    <div className={`field`} style={{ marginBottom: 14 }}>
      <label>{label}</label>
      <div className={`multiselect ${open ? 'open' : ''}`} ref={ref}>
        <button type="button" className="trigger" onClick={() => setOpen((o) => !o)}>
          {summary()}
          {selected.length > 0 && <span className="count">{selected.length}</span>}
          <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--muted)', fontSize: 11 }} />
        </button>
        {open && (
          <div className="panel">
            {options.length > 6 && (
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  marginBottom: 6,
                  fontSize: 12,
                  outline: 'none',
                }}
                autoFocus
              />
            )}
            {filtered.length === 0 ? (
              <div className="opt empty">No matches</div>
            ) : (
              filtered.map((o) => (
                <label key={o.value} className="opt">
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggle(o.value)}
                  />
                  {o.label}
                </label>
              ))
            )}
            <div className="panel-actions">
              <button type="button" onClick={selectAll}>Select all</button>
              <button type="button" onClick={clearAll}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
