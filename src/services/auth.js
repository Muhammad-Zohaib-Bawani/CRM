import { post, tokenStore } from '../api/client.js';

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

export async function logout() {
  const refreshToken = tokenStore.getRefresh();
  try {
    if (refreshToken) await post('/auth/logout', { refreshToken });
  } finally {
    tokenStore.clear();
  }
}

export async function forgotPassword(email) {
  return post('/auth/forgot-password', { email });
}

export async function validateResetToken(token) {
  return post('/auth/validate-reset-password-token', { token });
}

export async function resetPassword(token, password) {
  return post('/auth/reset-password', { token, password });
}
