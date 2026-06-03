import { get, post, put, del } from './client.js';

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

// ── Users ──────────────────────────────────────────────────────────────────

function normalizeUser(u) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return {
    id: u.id,
    name,
    email: u.email || '',
    role: (u.role || u.roleCode || '').toLowerCase(),
    initials: initials(name),
    isActive: u.isActive !== false,
  };
}

export async function getUsers() {
  const data = await get('/users?pageNumber=1&pageSize=200');
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeUser) : [];
}

export async function getAgents() {
  const data = await get('/users/agents');
  return Array.isArray(data) ? data.map(normalizeUser) : [];
}

// ── Managers ───────────────────────────────────────────────────────────────

function normalizeManager(m) {
  return {
    id: m.id, name: m.name || '', email: m.email || '',
    stable: m.stable || '', locationId: m.locationId,
    locationName: m.locationName || '', status: m.status || 'Active',
    userType: 'Manager', initials: initials(m.name),
    createdAt: m.createdAt,
  };
}

export async function getManagers() {
  const data = await get('/contacts/managers?pageNumber=1&pageSize=200');
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeManager) : [];
}

export async function createManager(req) {
  const data = await post('/contacts/managers', req);
  return normalizeManager(data);
}

export async function updateManager(id, req) {
  const data = await put(`/contacts/managers/${id}`, req);
  return normalizeManager(data);
}

export async function deleteManager(id) {
  return del(`/contacts/managers/${id}`);
}

// ── Owners ─────────────────────────────────────────────────────────────────

function normalizeOwner(o) {
  return {
    id: o.id, name: o.name || '', email: o.email || '',
    country: o.country || '', locationId: o.locationId,
    locationName: o.locationName || '', status: o.status || 'Active',
    userType: 'Owner', initials: initials(o.name),
    createdAt: o.createdAt,
  };
}

export async function getOwners() {
  const data = await get('/contacts/owners?pageNumber=1&pageSize=200');
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeOwner) : [];
}

export async function createOwner(req) {
  const data = await post('/contacts/owners', req);
  return normalizeOwner(data);
}

export async function updateOwner(id, req) {
  const data = await put(`/contacts/owners/${id}`, req);
  return normalizeOwner(data);
}

export async function deleteOwner(id) {
  return del(`/contacts/owners/${id}`);
}

// ── Horses ─────────────────────────────────────────────────────────────────

function normalizeHorse(h) {
  return {
    id: h.id, name: h.name || '', gender: h.gender || 'Male',
    owner: h.ownerId, ownerName: h.ownerName || '',
    age: h.age, createdAt: h.createdAt,
  };
}

export async function getHorses() {
  const data = await get('/contacts/horses?pageNumber=1&pageSize=200');
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeHorse) : [];
}

export async function createHorse(req) {
  const data = await post('/contacts/horses', req);
  return normalizeHorse(data);
}

export async function updateHorse(id, req) {
  const data = await put(`/contacts/horses/${id}`, req);
  return normalizeHorse(data);
}

export async function deleteHorse(id) {
  return del(`/contacts/horses/${id}`);
}

// ── Shows ──────────────────────────────────────────────────────────────────

function normalizeShow(s) {
  return {
    id: s.id, name: s.name || '',
    date: s.date ? s.date.split('T')[0] : '',
    locationName: s.locationName || '', createdAt: s.createdAt,
  };
}

export async function getShows() {
  const data = await get('/contacts/shows');
  return Array.isArray(data) ? data.map(normalizeShow) : [];
}

export async function createShow(req) {
  const data = await post('/contacts/shows', req);
  return normalizeShow(data);
}

// ── Championships ──────────────────────────────────────────────────────────

function normalizeChampionship(c) {
  return { id: c.id, name: c.name || '', createdAt: c.createdAt };
}

export async function getChampionships() {
  const data = await get('/contacts/championships');
  return Array.isArray(data) ? data.map(normalizeChampionship) : [];
}

export async function createChampionship(req) {
  const data = await post('/contacts/championships', req);
  return normalizeChampionship(data);
}

// ── Locations ──────────────────────────────────────────────────────────────

export async function getLocations() {
  const data = await get('/contacts/locations');
  return Array.isArray(data) ? data.map((l) => l.name || l) : [];
}

// ── Contacts (merged) ──────────────────────────────────────────────────────

export async function getAllContacts() {
  const [users, managers, owners] = await Promise.all([getUsers(), getManagers(), getOwners()]);
  const userContacts = users.map((u) => ({
    ...u,
    userType: u.role === 'admin' ? 'Admin' : 'Agent',
  }));
  return [...userContacts, ...managers, ...owners];
}
