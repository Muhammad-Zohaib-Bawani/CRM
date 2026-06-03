import { get, post, put, del } from './client.js';

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

export async function createForm(form, currentUser) {
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

export async function submitForm(formId, values) {
  const payload = {
    values: Object.entries(values || {}).map(([formFieldId, value]) => ({
      formFieldId,
      value: Array.isArray(value) ? value.join(',') : String(value ?? ''),
    })),
  };
  return post(`/forms/${formId}/submit`, payload);
}

export async function getFormResponses(formId, pageNumber = 1, pageSize = 50) {
  const data = await get(`/forms/${formId}/responses?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  const items = data?.items || data || [];
  return Array.isArray(items) ? items : [];
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
