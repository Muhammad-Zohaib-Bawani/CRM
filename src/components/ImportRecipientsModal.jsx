import { useState, useEffect } from 'react';
import MultiSelect from './MultiSelect.jsx';
import { fetchLookup, fetchUsers } from '../services/externalApi.js';

const EMPTY_FILTERS = {
  userTypes:       [],
  shows:           [],
  championships:   [],
  tournaments:     [],
  countries:       [],
  genders:         [],
};

const PAGE_SIZE = 10;

const DEFAULT_PAGINATION = {
  totalCount: 0, totalPages: 0,
  page: 1, pageSize: PAGE_SIZE,
  hasNextPage: false, hasPreviousPage: false,
};

export default function ImportRecipientsModal({ onImport, onClose, currentlyImported = [] }) {
  const [lookup, setLookup]       = useState({ championships: [], shows: [], tournaments: [], countries: [], genders: [], roles: [] });
  const [contacts, setContacts]   = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [fetchError, setFetchError]       = useState(null);

  const [filters, setFilters]     = useState(EMPTY_FILTERS);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // selected = Set of IDs; selectedContacts = Map<id, contact> for cross-page tracking
  const [selected, setSelected]               = useState(() => new Set(currentlyImported.map((c) => c.id)));
  const [selectedContacts, setSelectedContacts] = useState(() => {
    const m = new Map();
    currentlyImported.forEach((c) => m.set(c.id, c));
    return m;
  });

  // Load lookup options once
  useEffect(() => {
    let cancelled = false;
    fetchLookup()
      .then((data) => { if (!cancelled) { setLookup(data); setLoadingLookup(false); } })
      .catch((err) => { if (!cancelled) { setFetchError(err.message || 'Failed to load filters'); setLoadingLookup(false); } });
    return () => { cancelled = true; };
  }, []);

  // Debounce search — commits after 400 ms and resets to page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch users whenever page / filters / committed search changes
  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);
    setFetchError(null);
    fetchUsers({
      page,
      pageSize:        PAGE_SIZE,
      search:          debouncedSearch,
      roleIds:         filters.userTypes,
      countryIds:      filters.countries,
      showIds:         filters.shows,
      championshipIds: filters.championships,
      tournamentIds:   filters.tournaments,
      genderIds:       filters.genders,
    })
      .then(({ items, pagination: pg }) => {
        if (!cancelled) { setContacts(items); setPagination(pg); setLoadingUsers(false); }
      })
      .catch((err) => {
        if (!cancelled) { setFetchError(err.message || 'Failed to load users'); setLoadingUsers(false); }
      });
    return () => { cancelled = true; };
  }, [page, debouncedSearch, filters]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((p) => ({ ...p, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const [selectingAll, setSelectingAll] = useState(false);

  const selectedOnPage  = contacts.filter((c) => selected.has(c.id)).length;
  const allPageSelected = contacts.length > 0 && selectedOnPage === contacts.length;

  const selectAllFiltered = async () => {
    setSelectingAll(true);
    try {
      const commonParams = {
        search:          debouncedSearch,
        roleIds:         filters.userTypes,
        countryIds:      filters.countries,
        showIds:         filters.shows,
        championshipIds: filters.championships,
        tournamentIds:   filters.tournaments,
        genderIds:       filters.genders,
      };

      const allItems = [];
      let pg = 1;
      let hasMore = true;

      while (hasMore) {
        const { items, pagination: info } = await fetchUsers({ page: pg, pageSize: pagination.totalCount, ...commonParams });
        allItems.push(...items);
        hasMore = info.hasNextPage;
        pg += 1;
      }

      setSelected((prev) => {
        const next = new Set(prev);
        allItems.forEach((c) => next.add(c.id));
        return next;
      });
      setSelectedContacts((prev) => {
        const next = new Map(prev);
        allItems.forEach((c) => next.set(c.id, c));
        return next;
      });
    } catch (err) {
      console.error('Failed to select all:', err);
    } finally {
      setSelectingAll(false);
    }
  };

  const toggleOne = (id) => {
    const contact = contacts.find((c) => c.id === id);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSelectedContacts((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else if (contact) next.set(id, contact);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) contacts.forEach((c) => next.delete(c.id));
      else contacts.forEach((c) => next.add(c.id));
      return next;
    });
    setSelectedContacts((prev) => {
      const next = new Map(prev);
      if (allPageSelected) contacts.forEach((c) => next.delete(c.id));
      else contacts.forEach((c) => next.set(c.id, c));
      return next;
    });
  };

  const handleImport = () => {
    onImport([...selectedContacts.values()]);
    onClose();
  };

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0) || search;

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
              <h3><i className="fa-solid fa-filter" /> Filters</h3>
              {hasActiveFilters && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  <i className="fa-solid fa-xmark" /> Clear all
                </button>
              )}
            </div>
            <div className="import-filters-grid">
              <MultiSelect label="User type" placeholder="All types"
                options={lookup.roles.map((r) => ({ value: r.id, label: r.name }))}
                selected={filters.userTypes} onChange={(v) => setFilter('userTypes', v)} />
              <MultiSelect label="Shows" placeholder="Any show"
                options={lookup.shows.map((s) => ({ value: s.id, label: s.name }))}
                selected={filters.shows} onChange={(v) => setFilter('shows', v)} />
              <MultiSelect label="Championships" placeholder="Any championship"
                options={lookup.championships.map((c) => ({ value: c.id, label: c.name }))}
                selected={filters.championships} onChange={(v) => setFilter('championships', v)} />
              <MultiSelect label="Tournaments" placeholder="Any tournament"
                options={lookup.tournaments.map((t) => ({ value: t.id, label: t.name }))}
                selected={filters.tournaments} onChange={(v) => setFilter('tournaments', v)} />
              <MultiSelect label="Country" placeholder="Any country"
                options={lookup.countries.map((c) => ({ value: c.id, label: c.name }))}
                selected={filters.countries} onChange={(v) => setFilter('countries', v)} />
              <MultiSelect label="Horse Gender" placeholder="Any gender"
                options={lookup.genders.map((g) => ({ value: g.id, label: g.name }))}
                selected={filters.genders} onChange={(v) => setFilter('genders', v)} />
            </div>
          </div>

          {/* ============ ROW 2: STATS ============ */}
          <div className="import-stats">
            <div className="import-stat">
              <div className="lbl">Total Users</div>
              <div className="val">{pagination.totalCount.toLocaleString()}</div>
              <div className="icon"><i className="fa-solid fa-users" /></div>
            </div>
            <div className="import-stat">
              <div className="lbl">Total Pages</div>
              <div className="val">{pagination.totalPages.toLocaleString()}</div>
              <div className="icon"><i className="fa-solid fa-file-lines" /></div>
            </div>
            <div className="import-stat">
              <div className="lbl">Selected</div>
              <div className="val" style={{ color: 'var(--brand-deep)' }}>{selected.size}</div>
              <div className="icon"><i className="fa-solid fa-circle-check" /></div>
            </div>
          </div>

          {/* ============ ROW 3: TABLE TOOLBAR ============ */}
          <div className="import-table-toolbar">
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--muted)', fontSize: 13, pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  border: '1.5px solid var(--line)',
                  borderRadius: 10,
                  background: '#f8fafc',
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand)';
                  e.target.style.background = '#fff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184,139,86,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--line)';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  title="Clear"
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 22, height: 22, borderRadius: 6,
                    display: 'grid', placeItems: 'center',
                    background: 'var(--line)', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 10, transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--line)'}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
            <button
              type="button"
              className={`btn btn-sm ${allPageSelected ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleAll}
              disabled={contacts.length === 0 || loadingUsers}
            >
              <i className={`fa-solid ${allPageSelected ? 'fa-square-check' : 'fa-square'}`} />
              {allPageSelected ? 'Deselect page' : 'Select page'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-gold"
              onClick={selectAllFiltered}
              disabled={pagination.totalCount === 0 || loadingUsers || selectingAll}
            >
              {selectingAll
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Selecting…</>
                : <><i className="fa-solid fa-check-double" /> Select all {pagination.totalCount.toLocaleString()}</>
              }
            </button>
          </div>

          {/* ============ ROW 4: TABLE ============ */}
          <div className="import-table-wrap" style={{ position: 'relative' }}>
            {/* Soft overlay while paginating / filtering (data already visible) */}
            {loadingUsers && contacts.length > 0 && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 10, zIndex: 2,
                background: 'rgba(255,255,255,0.65)', display: 'grid', placeItems: 'center',
              }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20, color: 'var(--brand)' }} />
              </div>
            )}
            <table className="import-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>User Name</th>
                  <th>User Type</th>
                  <th>User Email</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {(loadingLookup || (loadingUsers && contacts.length === 0)) ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22, color: 'var(--brand)', display: 'block', marginBottom: 8 }} />
                      Loading…
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 22, color: '#ef4444', display: 'block', marginBottom: 8 }} />
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{fetchError}</span>
                      <br />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={() => {
                          setFetchError(null);
                          setPage(1);
                          setFilters(EMPTY_FILTERS);
                          setSearch('');
                        }}
                      >
                        <i className="fa-solid fa-rotate-right" /> Retry
                      </button>
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <i className="fa-solid fa-filter-circle-xmark" style={{ fontSize: 24, color: 'var(--brand)', display: 'block', marginBottom: 8 }} />
                      No contacts match these filters
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const isSelected = selected.has(c.id);
                    return (
                      <tr key={c.id} onClick={() => toggleOne(c.id)} className={isSelected ? 'is-selected' : ''}>
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
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
                        </td>
                        <td>
                          <span className={`type-pill type-${c.userType.toLowerCase().replace(/\s+/g, '-')}`}>
                            {c.userType}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                          {c.email}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {c.location || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ============ ROW 5: PAGINATION ============ */}
          {!fetchError && pagination.totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, paddingTop: 12,
            }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!pagination.hasPreviousPage || loadingUsers}
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="fa-solid fa-chevron-left" /> Prev
              </button>
              <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 120, textAlign: 'center' }}>
                Page <strong style={{ color: 'var(--ink)' }}>{pagination.page}</strong> of {pagination.totalPages.toLocaleString()}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!pagination.hasNextPage || loadingUsers}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <span style={{ marginRight: 'auto', color: 'var(--muted)', fontSize: 13 }}>
            <strong style={{ color: 'var(--ink)' }}>{selected.size}</strong> of {pagination.totalCount.toLocaleString()} contacts selected
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
