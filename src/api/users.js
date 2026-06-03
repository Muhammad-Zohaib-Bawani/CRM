import { get, post, put, del } from './client.js';

function initials(name) {
  return (name || '').split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, 2);
}

function normalizeUser(u) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return {
    id: u.id,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    name,
    email: u.email || '',
    phone: u.phone || '',
    mobile: u.phone || '',
    dialCode: '',
    role: (u.role || '').toLowerCase(),
    roleName: u.roleName || '',
    isActive: u.isActive !== false,
    initials: initials(name),
  };
}

export async function listUsers({ pageNumber = 1, pageSize = 100, search = '' } = {}) {
  const params = new URLSearchParams({ pageNumber, pageSize });
  if (search) params.set('search', search);
  const data = await get(`/users?${params}`);
  const items = Array.isArray(data) ? data : (data?.items || []);
  return { items: items.map(normalizeUser), total: data?.totalCount ?? items.length };
}

export async function createUser(req) {
  const data = await post('/users', req);
  return normalizeUser(data);
}

export async function updateUser(id, req) {
  const data = await put(`/users/${id}`, req);
  return normalizeUser(data);
}

export async function deleteUser(id) {
  return del(`/users/${id}`);
}

export async function getRoles() {
  const data = await get('/roles');
  const items = Array.isArray(data) ? data : (data?.items || []);
  return items.map((r) => ({
    id: r.id,
    name: r.name || '',
    code: (r.code || '').toLowerCase(),
  }));
}
