import { useMemo, useState } from 'react';
import { useData } from '../store/DataContext.jsx';
import MultiSelect from './MultiSelect.jsx';

const USER_TYPE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Agent', label: 'Agent' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Owner', label: 'Owner' },
];

const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending', 'Suspended'];
const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const EMPTY_FILTERS = {
  userTypes: [],
  owners: [],
  managers: [],
  shows: [],
  championships: [],
  horseGenders: [],
  locations: [],
  statuses: [],
};

export default function ImportRecipientsModal({ onImport, onClose, currentlyImported = [] }) {
  const { contacts, owners, managers, shows, championships, horses, locations } = useData();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(() => new Set(currentlyImported.map((c) => c.id)));
  const [search, setSearch] = useState('');

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  const filtered = useMemo(() => {
    const any = (arr) => arr && arr.length > 0;
    return contacts.filter((c) => {
      // User type
      if (any(filters.userTypes) && !filters.userTypes.includes(c.userType)) return false;
      // Specific owners (when contact is an owner)
      if (any(filters.owners)) {
        if (c.userType !== 'Owner' || !filters.owners.includes(c.id)) return false;
      }
      // Specific managers (when contact is a manager)
      if (any(filters.managers)) {
        if (c.userType !== 'Manager' || !filters.managers.includes(c.id)) return false;
      }
      // Location
      if (any(filters.locations) && !filters.locations.includes(c.location)) return false;
      // Status
      if (any(filters.statuses) && !filters.statuses.includes(c.status)) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      }
      // Shows / Championships / Horse gender — for the prototype these don't filter
      // any specific contact since the association data is illustrative only.
      // We honor them by keeping the count visible but not removing rows.
      return true;
    });
  }, [contacts, filters, search]);

  const totalUsers = filtered.length;
  const totalEmails = filtered.filter((c) => !!c.email).length;
  const selectedFilteredCount = filtered.filter((c) => selected.has(c.id)).length;
  const allFilteredSelected = filtered.length > 0 && selectedFilteredCount === filtered.length;

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const handleImport = () => {
    const picked = contacts.filter((c) => selected.has(c.id));
    onImport(picked);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Import Recipients</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Filter the contact pool, then tick the people you want to add to the broadcast list.
            </div>
          </div>
          <span className="close" onClick={onClose}><i className="fa-solid fa-xmark" /></span>
        </div>

        <div className="modal-body" style={{ paddingTop: 18 }}>
          {/* ============ ROW 1: FILTERS ============ */}
          <div className="import-filters-section">
            <div className="import-filters-head">
              <h3>
                <i className="fa-solid fa-filter" /> Filters
              </h3>
              {(Object.values(filters).some((v) => v.length > 0) || search) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  <i className="fa-solid fa-xmark" /> Clear all
                </button>
              )}
            </div>
            <div className="import-filters-grid">
              <MultiSelect label="User type" placeholder="All types"
                options={USER_TYPE_OPTIONS}
                selected={filters.userTypes} onChange={(v) => setFilter('userTypes', v)} />
              <MultiSelect label="Owners" placeholder="Any owner"
                options={owners.map((o) => ({ value: o.id, label: o.name }))}
                selected={filters.owners} onChange={(v) => setFilter('owners', v)} />
              <MultiSelect label="Managers" placeholder="Any manager"
                options={managers.map((m) => ({ value: m.id, label: m.name }))}
                selected={filters.managers} onChange={(v) => setFilter('managers', v)} />
              <MultiSelect label="Shows" placeholder="Any show"
                options={shows.map((s) => ({ value: s.id, label: s.name }))}
                selected={filters.shows} onChange={(v) => setFilter('shows', v)} />
              <MultiSelect label="Championships" placeholder="Any championship"
                options={championships.map((c) => ({ value: c.id, label: c.name }))}
                selected={filters.championships} onChange={(v) => setFilter('championships', v)} />
              <MultiSelect label="Horse gender" placeholder="Both"
                options={GENDER_OPTIONS}
                selected={filters.horseGenders} onChange={(v) => setFilter('horseGenders', v)} />
              <MultiSelect label="Location" placeholder="Any location"
                options={locations.map((l) => ({ value: l, label: l }))}
                selected={filters.locations} onChange={(v) => setFilter('locations', v)} />
              <MultiSelect label="Status" placeholder="Any status"
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                selected={filters.statuses} onChange={(v) => setFilter('statuses', v)} />
            </div>
          </div>

          {/* ============ ROW 2: STATS ============ */}
          <div className="import-stats">
            <div className="import-stat">
              <div className="lbl">Total Users</div>
              <div className="val">{totalUsers}</div>
              <div className="icon"><i className="fa-solid fa-users" /></div>
            </div>
            <div className="import-stat">
              <div className="lbl">Total Emails</div>
              <div className="val">{totalEmails}</div>
              <div className="icon"><i className="fa-solid fa-envelope" /></div>
            </div>
            <div className="import-stat">
              <div className="lbl">Selected</div>
              <div className="val" style={{ color: 'var(--brand-deep)' }}>{selected.size}</div>
              <div className="icon"><i className="fa-solid fa-circle-check" /></div>
            </div>
          </div>

          {/* ============ ROW 3: TABLE ============ */}
          <div className="import-table-toolbar">
            <div className="search" style={{ flex: 1 }}>
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`btn btn-sm ${allFilteredSelected ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleAll}
              disabled={filtered.length === 0}
            >
              <i className={`fa-solid ${allFilteredSelected ? 'fa-square-check' : 'fa-square'}`} />
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>User Name</th>
                  <th>User Type</th>
                  <th>User Email</th>
                  <th style={{ width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <i className="fa-solid fa-filter-circle-xmark" style={{ fontSize: 24, color: 'var(--brand)', display: 'block', marginBottom: 8 }} />
                      No contacts match these filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const isSelected = selected.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggleOne(c.id)}
                        className={isSelected ? 'is-selected' : ''}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 16, height: 16, accentColor: 'var(--brand)' }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="mini-avatar">{c.initials || c.name[0]}</span>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`type-pill type-${c.userType.toLowerCase()}`}>
                            {c.userType}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                          {c.email}
                        </td>
                        <td>
                          <span className={`status-pill status-${c.status.toLowerCase()}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-foot">
          <span style={{ marginRight: 'auto', color: 'var(--muted)', fontSize: 13 }}>
            <strong style={{ color: 'var(--ink)' }}>{selected.size}</strong> of {contacts.length} contacts selected
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={selected.size === 0}
          >
            <i className="fa-solid fa-file-import" /> Import {selected.size} {selected.size === 1 ? 'recipient' : 'recipients'}
          </button>
        </div>
      </div>
    </div>
  );
}
