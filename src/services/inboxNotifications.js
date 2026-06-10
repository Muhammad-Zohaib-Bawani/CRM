import { get, put, del } from '../api/client.js';

function normalize(n) {
  return {
    id: n.id,
    title: n.title || '',
    message: n.message || '',
    type: n.type || '',
    read: n.read ?? false,
    redirectUrl: n.redirectUrl || '',
    createdAt: n.createdAt,
  };
}

export async function getInboxNotifications(pageNumber = 1, pageSize = 30) {
  const data = await get(`/notifications?pageNumber=${pageNumber}&pageSize=${pageSize}&isRead=true`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalize) : [];
}

export async function getUnreadCount() {
  const count = await get('/notifications/count');
  return typeof count === 'number' ? count : 0;
}

export async function markAllRead() {
  return put('/notifications/mark-all-read');
}

export async function markRead(id) {
  return put(`/notifications/${id}/mark-read`);
}

export async function deleteInboxNotification(id) {
  return del(`/notifications/${id}`);
}
