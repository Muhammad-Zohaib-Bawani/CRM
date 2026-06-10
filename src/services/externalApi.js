const BASE_URL = import.meta.env.VITE_GCAT_API_URL || '';
const API_KEY  = import.meta.env.VITE_GCAT_API_KEY  || '';

async function request(path, options = {}, { unwrap = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message || body?.title || `External API error ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }

  const json = await res.json().catch(() => null);
  if (!unwrap) return json;
  return json?.data !== undefined ? json.data : json;
}

// ── Normalise external user shape into the app's contact format ──────────────
function normalizeContact(c) {
  const name =
    c.fullName ||
    `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
    c.name ||
    c.userName ||
    c.email ||
    'Unknown';

  const parts = name.split(' ').filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return {
    id:       String(c.id ?? c.userId ?? c.contactId ?? ''),
    name,
    email:    c.email || c.emailAddress || '',
    userType: c.roleName || c.userType || c.type || c.role || 'Contact',
    status:   c.isActive === false ? 'Inactive' : (c.status || 'Active'),
    location: c.countryName || c.location || c.city || c.country || '',
    initials,
  };
}

// ── /External/users ──────────────────────────────────────────────────────────
// Accepts server-side params; returns { items, pagination }
export async function fetchUsers({
  page         = 1,
  pageSize     = 10,
  search       = '',
  roleIds      = [],
  countryIds   = [],
  showIds      = [],
  championshipIds = [],
  tournamentIds   = [],
  genderIds    = [],
} = {}) {
  const params = new URLSearchParams();
  params.set('page',     String(page));
  params.set('pageSize', String(pageSize));
  if (search) params.set('search', search);
  roleIds.forEach((id)          => params.append('roleId',          id));
  countryIds.forEach((id)       => params.append('countryId',       id));
  showIds.forEach((id)          => params.append('showId',          id));
  championshipIds.forEach((id)  => params.append('championshipId',  id));
  tournamentIds.forEach((id)    => params.append('tournamentId',    id));
  genderIds.forEach((id)        => params.append('horseGenderId',   id));

  const json = await request(`/External/users?${params}`, {}, { unwrap: false });
  return {
    items:      (json?.data ?? []).map(normalizeContact),
    pagination: json?.pagination ?? {
      totalCount: 0, totalPages: 0,
      page, pageSize,
      hasNextPage: false, hasPreviousPage: false,
    },
  };
}

// ── /External/lookup ─────────────────────────────────────────────────────────
// Returns { championships, shows, tournaments, countries, genders, roles }
// Each value is [{ id, name }]
export async function fetchLookup() {
  const data = await request('/External/lookup');
  return {
    championships: data?.championships ?? [],
    shows:         data?.shows         ?? [],
    tournaments:   data?.tournaments   ?? [],
    countries:     data?.countries     ?? [],
    genders:       data?.genders       ?? [],
    roles:         data?.roles         ?? [],
  };
}
