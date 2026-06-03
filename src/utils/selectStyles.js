// Shared react-select styles matching GCAT CRM design tokens

export const rsStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#b8956a' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(184,149,106,0.18)' : 'none',
    borderRadius: '10px',
    minHeight: '38px',
    fontSize: '13px',
    background: '#fafafa',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    '&:hover': { borderColor: '#b8956a' },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '13px',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1e293b',
    fontSize: '13px',
  }),
  input: (base) => ({
    ...base,
    color: '#1e293b',
    fontSize: '13px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#b8956a'
      : state.isFocused
      ? '#efe4d3'
      : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px 12px',
    '&:active': { backgroundColor: '#9a7b56' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.10)',
    zIndex: 9999,
    overflow: 'hidden',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#b8956a' : '#94a3b8',
    padding: '0 8px',
    transition: 'transform 0.2s',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '0 6px',
    '&:hover': { color: '#dc2626' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 10px',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#efe4d3',
    borderRadius: '6px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#9a7b56',
    fontSize: '12px',
    fontWeight: 600,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#9a7b56',
    borderRadius: '0 6px 6px 0',
    '&:hover': { backgroundColor: '#b8956a', color: 'white' },
  }),
};

// Compact variant for filter bars
export const rsStylesCompact = {
  ...rsStyles,
  control: (base, state) => ({
    ...rsStyles.control(base, state),
    minHeight: '34px',
    fontSize: '12px',
  }),
  placeholder: (base) => ({ ...rsStyles.placeholder(base), fontSize: '12px' }),
  singleValue: (base) => ({ ...rsStyles.singleValue(base), fontSize: '12px' }),
  option: (base, state) => ({ ...rsStyles.option(base, state), fontSize: '12px', padding: '7px 12px' }),
};

// Helper: build options array with optional "All" first entry
export function toOptions(items, allLabel) {
  const base = items.map((item) =>
    typeof item === 'string'
      ? { value: item, label: item }
      : item
  );
  return allLabel ? [{ value: 'all', label: allLabel }, ...base] : base;
}

// Helper: find the current option object (returns null when value === 'all')
export function findOption(options, value) {
  if (value === 'all' || value == null || value === '') return null;
  return options.find((o) => o.value === value) || null;
}
