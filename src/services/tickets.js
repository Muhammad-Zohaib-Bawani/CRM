import { get, post, put, del } from '../api/client.js';
import { STATUS_FROM_BACKEND, STATUS_TO_BACKEND } from '../enums/tickets.js';

function normalizeTicket(t) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber || t.id,
    title: t.title || '',
    description: t.description || '',
    type: t.type || 'Task',
    priority: t.priority || 'Medium',
    status: STATUS_FROM_BACKEND[t.status] || 'open',
    createdBy: t.reportedById || null,
    reportedByName: t.reportedByName || '',
    assignedTo: t.assignedToId || null,
    assignedToName: t.assignedToName || '',
    dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
    attachments: (t.attachments || []).map((a) => {
      const ext = (a.fileName || '').split('.').pop().toLowerCase();
      const type = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : '';
      return { id: a.id, name: a.fileName, url: a.fileUrl, size: a.fileSize, type, createdAt: a.createdAt };
    }),
    comments: (t.comments || []).map((c) => ({
      id: c.id,
      authorId: c.userId,
      userName: c.userName,
      text: c.content,
      at: c.createdAt,
    })),
    commentCount: t.commentCount || (t.comments?.length ?? 0),
    attachmentCount: t.attachmentCount || (t.attachments?.length ?? 0),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt || t.createdAt,
  };
}

export async function getTickets(filter = {}) {
  const params = new URLSearchParams();
  if (filter.pageNumber) params.set('pageNumber', filter.pageNumber);
  if (filter.pageSize)   params.set('pageSize', filter.pageSize);
  if (filter.search)     params.set('search', filter.search);
  if (filter.status && filter.status !== 'all')
    params.set('status', STATUS_TO_BACKEND[filter.status] || filter.status);
  if (filter.priority && filter.priority !== 'all') params.set('priority', filter.priority);
  if (filter.type && filter.type !== 'all')         params.set('type', filter.type);
  if (filter.assignedToId)  params.set('assignedToId', filter.assignedToId);
  if (filter.dueDateFrom)   params.set('dueDateFrom', filter.dueDateFrom);
  if (filter.dueDateTo)     params.set('dueDateTo', filter.dueDateTo);

  const qs   = params.toString();
  const data = await get(`/tickets${qs ? '?' + qs : ''}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeTicket) : [];
}

export async function getTicketById(id) {
  const data = await get(`/tickets/${id}`);
  return normalizeTicket(data);
}

export async function createTicket(input) {
  const payload = {
    title: input.title,
    description: input.description || '',
    type: input.type || 'Task',
    priority: input.priority || 'Medium',
    dueDate: input.dueDate || null,
    assignedToId: input.assignedTo || null,
  };
  const data = await post('/tickets', payload);
  return normalizeTicket(data);
}

export async function updateTicket(id, patch) {
  const payload = {};
  if (patch.title !== undefined)       payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.type !== undefined)        payload.type = patch.type;
  if (patch.priority !== undefined)    payload.priority = patch.priority;
  if (patch.status !== undefined)
    payload.status = STATUS_TO_BACKEND[patch.status] || patch.status;
  if (patch.dueDate !== undefined)     payload.dueDate = patch.dueDate || null;
  if (patch.assignedTo !== undefined)  payload.assignedToId = patch.assignedTo || null;
  const data = await put(`/tickets/${id}`, payload);
  return normalizeTicket(data);
}

export async function deleteTicket(id) {
  return del(`/tickets/${id}`);
}

export async function addComment(ticketId, content) {
  const data = await post(`/tickets/${ticketId}/comments`, { content });
  return {
    id: data.id,
    authorId: data.userId,
    userName: data.userName,
    text: data.content,
    at: data.createdAt,
  };
}

export async function addAttachment(ticketId, { fileName, fileUrl, fileSize }) {
  const data = await post(`/tickets/${ticketId}/attachments`, { fileName, fileUrl, fileSize });
  return { id: data.id, name: data.fileName, url: data.fileUrl, size: data.fileSize, createdAt: data.createdAt };
}

export async function deleteAttachment(ticketId, attachmentId) {
  return del(`/tickets/${ticketId}/attachments/${attachmentId}`);
}
