import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage, KEYS } from './storage.js';
import {
  SEED_TICKETS,
  SEED_FORMS,
  SEED_NOTIFICATIONS,
  USERS,
  HORSES,
  OWNERS,
  MANAGERS,
  SHOWS,
  CHAMPIONSHIPS,
  LOCATIONS,
  TICKET_TYPES,
  CONTACTS,
} from '../data/seed.js';

const DataContext = createContext(null);

function ensureSeed() {
  if (!storage.get(KEYS.SEEDED, false)) {
    storage.set(KEYS.TICKETS, SEED_TICKETS);
    storage.set(KEYS.FORMS, SEED_FORMS);
    storage.set(KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    storage.set(KEYS.FORM_RESPONSES, []);
    storage.set(KEYS.SEEDED, true);
  }
}

let _ticketSeq = 1100;
function nextTicketId(existing) {
  const used = new Set(existing.map((t) => t.id));
  while (used.has(`TKT-${_ticketSeq}`)) _ticketSeq += 1;
  return `TKT-${_ticketSeq++}`;
}

export function DataProvider({ children }) {
  ensureSeed();
  const [tickets, setTickets] = useState(() => storage.get(KEYS.TICKETS, []));
  const [notifications, setNotifications] = useState(() => storage.get(KEYS.NOTIFICATIONS, []));
  const [forms, setForms] = useState(() => storage.get(KEYS.FORMS, []));
  const [responses, setResponses] = useState(() => storage.get(KEYS.FORM_RESPONSES, []));
  const [toast, setToast] = useState(null);

  useEffect(() => storage.set(KEYS.TICKETS, tickets), [tickets]);
  useEffect(() => storage.set(KEYS.NOTIFICATIONS, notifications), [notifications]);
  useEffect(() => storage.set(KEYS.FORMS, forms), [forms]);
  useEffect(() => storage.set(KEYS.FORM_RESPONSES, responses), [responses]);

  const showToast = useCallback((message, icon = 'fa-circle-check') => {
    setToast({ message, icon, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // ===== TICKETS =====
  const createTicket = (input, currentUser) => {
    const now = new Date().toISOString();
    const id = nextTicketId(tickets);
    const ticket = {
      id,
      title: input.title,
      description: input.description || '',
      type: input.type || 'Task',
      priority: input.priority || 'Medium',
      status: 'open',
      createdBy: currentUser.id,
      assignedTo: input.assignedTo || null,
      dueDate: input.dueDate || '',
      attachments: input.attachments || [],
      createdAt: now,
      updatedAt: now,
      comments: [],
    };
    setTickets((prev) => [ticket, ...prev]);
    showToast(`Ticket ${id} created`);
    return ticket;
  };

  const updateTicket = (id, patch) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
    );
  };

  const updateTicketStatus = (id, status) => {
    updateTicket(id, { status });
    showToast(`Ticket ${id} moved to ${statusLabel(status)}`);
  };

  const assignTicket = (id, agentId) => {
    updateTicket(id, { assignedTo: agentId });
    const agent = USERS.find((u) => u.id === agentId);
    showToast(`Assigned to ${agent ? agent.name : 'unassigned'}`, 'fa-user-tag');
  };

  const addComment = (id, comment) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              comments: [...t.comments, { ...comment, id: `cm-${Date.now()}`, at: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // ===== NOTIFICATIONS =====
  const sendNotification = (notif, currentUser, recipientCount) => {
    const id = `nt-${Date.now()}`;
    const record = {
      id,
      ...notif,
      sentBy: currentUser.id,
      sentAt: new Date().toISOString(),
      recipientCount,
    };
    setNotifications((prev) => [record, ...prev]);
    showToast(`Notification sent to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`, 'fa-paper-plane');
    return record;
  };

  // ===== FORMS =====
  const saveForm = (form, currentUser) => {
    if (form.id) {
      setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, ...form } : f)));
      showToast(`Form "${form.name}" updated`);
      return form;
    }
    const created = {
      ...form,
      id: `frm-${Date.now()}`,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setForms((prev) => [created, ...prev]);
    showToast(`Form "${created.name}" created`);
    return created;
  };

  const deleteForm = (id) => {
    setForms((prev) => prev.filter((f) => f.id !== id));
    showToast('Form deleted', 'fa-trash');
  };

  const submitFormResponse = (formId, values) => {
    const record = { id: `rsp-${Date.now()}`, formId, values, at: new Date().toISOString() };
    setResponses((prev) => [record, ...prev]);
    return record;
  };

  const resetAll = () => {
    storage.clearAll();
    window.location.reload();
  };

  return (
    <DataContext.Provider
      value={{
        tickets,
        notifications,
        forms,
        responses,
        users: USERS,
        horses: HORSES,
        owners: OWNERS,
        managers: MANAGERS,
        shows: SHOWS,
        championships: CHAMPIONSHIPS,
        locations: LOCATIONS,
        ticketTypes: TICKET_TYPES,
        contacts: CONTACTS,
        toast,
        showToast,
        createTicket,
        updateTicket,
        updateTicketStatus,
        assignTicket,
        addComment,
        sendNotification,
        saveForm,
        deleteForm,
        submitFormResponse,
        resetAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function statusLabel(status) {
  return { open: 'Open', progress: 'In Progress', completed: 'Completed' }[status] || status;
}
