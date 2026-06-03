import { post, tokenStore } from './client.js';

function normalizeUser(u) {
  if (!u) return null;
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
  const words = name.split(' ').filter(Boolean);
  const initials = words.map((w) => w[0].toUpperCase()).join('').slice(0, 2);
  return {
    id: u.id,
    name,
    email: u.email,
    role: (u.roleCode || u.role || '').toLowerCase(),
    initials,
    permissions: u.permissions || [],
  };
}

export async function login(email, password) {
  const data = await post('/auth/login', { email, password });
  tokenStore.set(data.accessToken);
  tokenStore.setRefresh(data.refreshToken);
  return { user: normalizeUser(data.user), token: data.accessToken };
}

export async function logout(refreshToken) {
  try {
    await post('/auth/logout', { refreshToken });
  } finally {
    tokenStore.clear();
  }
}
