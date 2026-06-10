import { get, post } from '../api/client.js';

function normalizeNotification(n) {
  return {
    id: n.id,
    subject: n.subject || '',
    body: n.bodyHtml || '',
    sentBy: n.sentById,
    sentByName: n.sentByName || '',
    sentAt: n.sentAt || n.createdAt,
    recipientCount: n.totalRecipients || 0,
    formCampaignId: n.formCampaignId || null,
    attachments: (n.attachments || []).map((a) => ({ name: a.fileName, url: a.fileUrl })),
    recipients: (n.recipients || []).map((r) => {
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
    jobStatus:     n.jobStatus     || 'Queued',
    jobStartedAt:  n.jobStartedAt  || null,
    jobCompletedAt: n.jobCompletedAt || null,
    jobError:      n.jobError      || null,
    createdAt: n.createdAt,
  };
}

export async function getNotifications(pageNumber = 1, pageSize = 50) {
  const data = await get(`/emailnotifications?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeNotification) : [];
}

export async function getNotificationById(id) {
  const data = await get(`/emailnotifications/${id}`);
  return normalizeNotification(data);
}

export async function sendNotification(payload) {
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
