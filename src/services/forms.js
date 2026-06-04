import { get, post, put, del, BASE, tokenStore } from '../api/client.js';

function normalizeField(f) {
  let options = f.options;
  if (typeof options === 'string') {
    try { options = JSON.parse(options); } catch { options = []; }
  }
  return {
    id: f.id,
    name: f.label || f.name || '',
    type: (f.fieldType || f.type || 'text').toLowerCase(),
    sort: f.displayOrder || f.sort || 1,
    isRequired: f.isRequired || false,
    placeholder: f.placeholder || '',
    options: Array.isArray(options) ? options : [],
  };
}

function normalizeForm(f) {
  return {
    id: f.id,
    name: f.title || f.name || '',
    isActive: f.isActive !== false,
    createdBy: f.createdBy || null,
    createdByName: f.createdByName || '',
    createdAt: f.createdAt,
    fieldCount: f.fieldCount || (f.fields?.length ?? 0),
    responseCount: f.responseCount || 0,
    fields: (f.fields || []).map(normalizeField).sort((a, b) => a.sort - b.sort),
    webhookUrl: f.webhookUrl || '',
  };
}

function capitalize(str) {
  if (!str) return 'Text';
  const map = {
    text: 'Text', textarea: 'Textarea', toggle: 'Toggle',
    checkbox: 'Checkbox', date: 'Date', time: 'Time',
    select: 'Select', number: 'Text', email: 'Text', other: 'Text',
  };
  return map[str.toLowerCase()] || 'Text';
}

export async function getForms(pageNumber = 1, pageSize = 100, search = '') {
  const qs = `?pageNumber=${pageNumber}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  const data = await get(`/forms${qs}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items.map(normalizeForm) : [];
}

export async function getFormById(id) {
  const data = await get(`/forms/${id}`);
  return normalizeForm(data);
}

export async function createForm(form) {
  const payload = {
    title: form.name,
    webhookUrl: form.webhookUrl || null,
    fields: (form.fields || []).map((f, i) => ({
      label: f.name,
      fieldType: capitalize(f.type),
      isRequired: f.isRequired || false,
      options: f.options?.length ? f.options : null,
      displayOrder: f.sort || i + 1,
    })),
  };
  const data = await post('/forms', payload);
  return normalizeForm(data);
}

export async function updateForm(id, form) {
  const payload = {
    title: form.name,
    webhookUrl: form.webhookUrl || null,
    isActive: form.isActive !== false,
    fields: (form.fields || []).map((f, i) => ({
      label: f.name,
      fieldType: capitalize(f.type),
      isRequired: f.isRequired || false,
      options: f.options?.length ? f.options : null,
      displayOrder: f.sort || i + 1,
    })),
  };
  const data = await put(`/forms/${id}`, payload);
  return normalizeForm(data);
}

export async function deleteForm(id) {
  return del(`/forms/${id}`);
}

export async function checkFormToken(token) {
  return get(`/forms/check-token/${token}`);
}

export async function submitForm(formId, values, { email = '', name = '', token = null } = {}) {
  const payload = {
    submissionToken: token || null,
    submittedByEmail: email || null,
    submittedByName: name || null,
    values: Object.entries(values || {}).map(([formFieldId, value]) => ({
      formFieldId,
      value: Array.isArray(value) ? value.join(',') : String(value ?? ''),
    })),
  };
  return post(`/forms/${formId}/submit`, payload);
}

export async function getFormResponses(formId, pageNumber = 1, pageSize = 200) {
  const data = await get(`/forms/${formId}/responses?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items : [];
}

export async function getFormResponsesByCampaign(campaignId, pageSize = 500) {
  const data = await get(`/forms/campaigns/${campaignId}/responses?pageNumber=1&pageSize=${pageSize}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items : [];
}

export async function exportFormResponsesByCampaign(campaignId) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/forms/campaigns/${campaignId}/responses/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const fileName = match ? match[1].replace(/['"]/g, '') : 'responses.xlsx';
  return { blob, fileName };
}

function normalizeCampaign(c) {
  const n = c.emailNotification || {};
  return {
    id: n.id || c.emailNotificationId,
    subject: n.subject || '',
    sentAt: n.sentAt || c.createdAt,
    sentByName: n.sentByName || '',
    formId: c.formId || null,
    formName: c.formName || '',
    formCampaignId: c.id,
    form: { id: c.formId, name: c.formName || '', fields: [] },
    recipients: (n.recipients || []).map((r) => {
      const raw = r.submissionToken || '';
      const token = raw && raw !== '00000000-0000-0000-0000-000000000000' ? raw : null;
      return {
        id: r.id,
        email: r.email || '',
        name: r.name || '',
        userType: r.recipientType || 'User',
        status: r.status || '',
        submissionToken: token,
        isFormSubmitted: r.isFormSubmitted ?? false,
        formSubmittedAt: r.formSubmittedAt ?? null,
      };
    }),
  };
}

export async function getFormCampaigns(pageSize = 200) {
  const data = await get(`/FormCampaigns?pageNumber=1&pageSize=${pageSize}`);
  const items = data?.items || (Array.isArray(data) ? data : []);
  return items.map(normalizeCampaign);
}

export async function exportFormResponses(formId) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/forms/${formId}/responses/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const fileName = match ? match[1].replace(/['"]/g, '') : 'responses.xlsx';
  return { blob, fileName };
}
