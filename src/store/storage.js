// Thin localStorage wrapper. Keys are namespaced under "gcat:".

const PREFIX = 'gcat:';

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};

export const KEYS = {
  AUTH: 'auth',
  TICKETS: 'tickets',
  NOTIFICATIONS: 'notifications',
  FORMS: 'forms',
  FORM_RESPONSES: 'form_responses',
  SEEDED: 'seeded_v4',
};
