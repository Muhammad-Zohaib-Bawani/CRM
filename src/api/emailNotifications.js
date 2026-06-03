import { get, post } from './client.js';

function normalizeNotification(n) {
  return {
    id: n.id,
    subject: n.subject || '',
    body: n.bodyHtml || '',
    sentBy: n.sentById,
    sentByName: n.sentByName || '',
    sentAt: n.sentAt || n.createdAt,
    recipientCount: n.totalRecipients || 0,
    attachments: (n.attachments || []).map((a) => ({ name: a.fileName, url: a.fileUrl })),
    recipients: (n.recipients || []).map((r) => {
      // Guard against Guid.Empty (all-zeros) — treat it as no token
      const rawToken = r.submissionToken || r.SubmissionToken || '';
      const token = rawToken && rawToken !== '00000000-0000-0000-0000-000000000000'
        ? rawToken : null;
      return {
        id: r.id || r.Id,
        email: r.email || r.Email,
        name: r.name || r.Name,
        userType: r.recipientType || r.RecipientType,
        status: r.status || r.Status,
        submissionToken: token,
        isFormSubmitted: r.isFormSubmitted ?? r.IsFormSubmitted ?? false,
        formSubmittedAt: r.formSubmittedAt ?? r.FormSubmittedAt ?? null,
      };
    }),
    createdAt: n.createdAt,
  };
}

export async function sendEmailNotification(payload) {
  const body = {
    subject: payload.subject,
    bodyHtml: payload.body,
    recipients: (payload.recipients || []).map((r) => ({
      email: r.email,
      name: r.name,
      recipientType: r.userType || 'User',
    })),
    attachments: (payload.attachments || []).map((a) => ({
      fileName: a.name,
      fileUrl: a.url || '',
    })),
  };
  const data = await post('/emailnotifications', body);
  return normalizeNotification(data);
}

export async function getEmailNotifications(pageNumber = 1, pageSize = 50) {
  const data = await get(`/emailnotifications?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeNotification) : [];
}

export async function getEmailNotificationById(id) {
  const data = await get(`/emailnotifications/${id}`);
  return normalizeNotification(data);
}
