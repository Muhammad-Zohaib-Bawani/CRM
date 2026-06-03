const BASE = import.meta.env.VITE_API_URL || 'https://bid-uat-auc.kiahf.com/api/v1';

const TOKEN_KEY = 'gcat:token';
const REFRESH_KEY = 'gcat:refresh_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t) => localStorage.setItem(REFRESH_KEY, t),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

let refreshing = null;

async function doRefresh() {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  const json = await res.json();
  if (!res.ok || !json.data?.accessToken) {
    tokenStore.clear();
    window.dispatchEvent(new Event('gcat:logout'));
    throw new Error('Session expired');
  }
  tokenStore.set(json.data.accessToken);
  if (json.data.refreshToken) tokenStore.setRefresh(json.data.refreshToken);
  return json.data.accessToken;
}

export async function request(method, path, data, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const cfg = { method, headers };
  if (data !== undefined) cfg.body = JSON.stringify(data);

  let res = await fetch(`${BASE}${path}`, cfg);

  if (res.status === 401 && !opts._retry) {
    if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
    try {
      const newToken = await refreshing;
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { ...cfg, headers });
    } catch {
      throw new Error('Session expired. Please log in again.');
    }
  }

  const json = res.headers.get('content-type')?.includes('json') ? await res.json() : null;

  if (!res.ok) {
    const msg = json?.message || json?.title || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json?.data !== undefined ? json.data : json;
}

export const get = (path, opts) => request('GET', path, undefined, opts);
export const post = (path, data, opts) => request('POST', path, data, opts);
export const put = (path, data, opts) => request('PUT', path, data, opts);
export const del = (path, opts) => request('DELETE', path, undefined, opts);
