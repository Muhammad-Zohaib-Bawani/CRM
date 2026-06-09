import { get } from '../api/client.js';

export async function getDashboardStats() {
  return get('/dashboard/stats');
}
