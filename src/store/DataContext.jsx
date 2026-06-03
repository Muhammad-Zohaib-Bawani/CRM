import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as ticketApi from '../api/tickets.js';
import * as notifApi from '../api/emailNotifications.js';
import * as formApi from '../api/forms.js';
import * as contactApi from '../api/contacts.js';

const DataContext = createContext(null);

const TICKET_TYPES = ['Bug', 'Task'];

function extractFormId(html) {
  if (!html) return null;
  const m = html.match(/\/form\/([\w-]+)/);
  return m ? m[1] : null;
}

const SEED_MANAGED_USERS = [
  {
    id: 'mu1', firstName: 'Sarah', lastName: 'Mitchell', name: 'Sarah Mitchell',
    email: 'sarah@gcat.app', role: 'admin', country: 'US', dialCode: '+1',
    mobile: '555 000 0001', initials: 'SM',
  },
  {
    id: 'mu2', firstName: 'James', lastName: 'Carter', name: 'James Carter',
    email: 'james@gcat.app', role: 'agent', country: 'GB', dialCode: '+44',
    mobile: '7911 123456', initials: 'JC',
  },
  {
    id: 'mu3', firstName: 'Amira', lastName: 'Hassan', name: 'Amira Hassan',
    email: 'amira@gcat.app', role: 'agent', country: 'AE', dialCode: '+971',
    mobile: '50 123 4567', initials: 'AH',
  },
  {
    id: 'mu4', firstName: 'Robert', lastName: 'Klein', name: 'Robert Klein',
    email: 'robert@gcat.app', role: 'user', country: 'DE', dialCode: '+49',
    mobile: '155 1234 5678', initials: 'RK',
  },
  {
    id: 'mu5', firstName: 'Priya', lastName: 'Sharma', name: 'Priya Sharma',
    email: 'priya@gcat.app', role: 'user', country: 'IN', dialCode: '+91',
    mobile: '98765 43210', initials: 'PS',
  },
];

// API calls per page:
//   /            → tickets, notifications, forms
//   /tickets     → + users, agents
//   /notifications → + users, managers, owners, horses, shows, championships, locations
//   /forms       → (nothing extra — forms already loaded)
//   /notification-history → (nothing extra)

export function DataProvider({ children }) {
  const { user } = useAuth();

  // ── Core: loaded on login (needed by Dashboard stats) ────────────────────
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Users: lazy — Dashboard/Tickets/Notifications ────────────────────────
  const [users, setUsers] = useState([]);
  const usersLoadedRef = useRef(false);

  // ── Managed users: User Management page (local, no API) ──────────────────
  const [managedUsers, setManagedUsers] = useState(SEED_MANAGED_USERS);

  // ── Form responses: tracked locally + persisted in localStorage ───────────
  const [formResponses, setFormResponses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gcat:formResponses') || '[]'); }
    catch { return []; }
  });

  // ── Agents: lazy — Tickets page only ─────────────────────────────────────
  const [agents, setAgents] = useState([]);
  const agentsLoadedRef = useRef(false);

  // ── Contacts: lazy — Notifications page only ─────────────────────────────
  const [managers, setManagers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [shows, setShows] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [locations, setLocations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const contactsLoadedRef = useRef(false);

  const [toast, setToast] = useState(null);
  const fetchedRef = useRef(false);

  const showToast = useCallback((message, icon = 'fa-circle-check') => {
    setToast({ message, icon, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Clear everything on logout
  useEffect(() => {
    if (!user) {
      setTickets([]); setNotifications([]); setForms([]);
      setUsers([]); setAgents([]);
      setManagers([]); setOwners([]); setHorses([]); setShows([]);
      setChampionships([]); setLocations([]); setContacts([]);
      setManagedUsers(SEED_MANAGED_USERS);
      setFormResponses([]);
      try { localStorage.removeItem('gcat:formResponses'); } catch {}
      fetchedRef.current = false;
      usersLoadedRef.current = false;
      agentsLoadedRef.current = false;
      contactsLoadedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadCore();
  }, [user]);

  // ── Core: tickets · notifications · forms ────────────────────────────────
  async function loadCore() {
    setLoading(true);
    try {
      const [ticketData, notifData, formData] = await Promise.allSettled([
        ticketApi.getTickets({ pageSize: 200 }),
        notifApi.getEmailNotifications(1, 200),
        formApi.getForms(1, 100),
      ]);
      const resolve = (r, fallback = []) => r.status === 'fulfilled' ? r.value : fallback;
      const formList = resolve(formData);
      const formMap = new Map(formList.map((f) => [f.id, f.name]));
      const enrichedNotifs = resolve(notifData).map((n) => {
        const fid = extractFormId(n.body);
        return { ...n, formId: fid, formName: fid ? (formMap.get(fid) || null) : null };
      });
      setTickets(resolve(ticketData));
      setNotifications(enrichedNotifs);
      setForms(formList);
    } catch (err) {
      console.error('Failed to load core data:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Lazy: users — Dashboard · Tickets · Notifications ────────────────────
  const loadUsers = useCallback(async () => {
    if (usersLoadedRef.current) return;
    usersLoadedRef.current = true;
    try {
      const data = await contactApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      usersLoadedRef.current = false;
    }
  }, []);

  // ── Lazy: agents — Tickets page ───────────────────────────────────────────
  const loadAgents = useCallback(async () => {
    if (agentsLoadedRef.current) return;
    agentsLoadedRef.current = true;
    try {
      const data = await contactApi.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
      agentsLoadedRef.current = false;
    }
  }, []);

  // ── Lazy: contacts — Notifications page ──────────────────────────────────
  const loadContacts = useCallback(async () => {
    if (contactsLoadedRef.current) return;
    contactsLoadedRef.current = true;
    setContactsLoading(true);
    try {
      const [managerData, ownerData, horseData, showData, champData, locationData] =
        await Promise.allSettled([
          contactApi.getManagers(),
          contactApi.getOwners(),
          contactApi.getHorses(),
          contactApi.getShows(),
          contactApi.getChampionships(),
          contactApi.getLocations(),
        ]);
      const resolve = (r, fallback = []) => r.status === 'fulfilled' ? r.value : fallback;
      const managerList = resolve(managerData);
      const ownerList   = resolve(ownerData);
      setManagers(managerList);
      setOwners(ownerList);
      setHorses(resolve(horseData));
      setShows(resolve(showData));
      setChampionships(resolve(champData));
      setLocations(resolve(locationData));
      setContacts([
        ...users.map((u) => ({ ...u, userType: u.role === 'admin' ? 'Admin' : 'Agent' })),
        ...managerList,
        ...ownerList,
      ]);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      contactsLoadedRef.current = false;
    } finally {
      setContactsLoading(false);
    }
  }, [users]);

  // ===== TICKETS =====

  const createTicket = useCallback(async (input) => {
    try {
      const ticket = await ticketApi.createTicket(input);
      setTickets((prev) => [ticket, ...prev]);
      showToast(`Ticket ${ticket.ticketNumber} created`);
      return ticket;
    } catch (err) {
      showToast(err.message || 'Failed to create ticket', 'fa-triangle-exclamation');
      throw err;
    }
  }, [showToast]);

  const updateTicket = useCallback(async (id, patch) => {
    try {
      const updated = await ticketApi.updateTicket(id, patch);
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      return updated;
    } catch (err) {
      showToast(err.message || 'Failed to update ticket', 'fa-triangle-exclamation');
      throw err;
    }
  }, [showToast]);

  const updateTicketStatus = useCallback(async (id, status) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    showToast(`Ticket moved to ${statusLabel(status)}`);
    try {
      await ticketApi.updateTicket(id, { status });
    } catch (err) {
      setTickets((prev) => prev.map((t) =>
        t.id === id ? { ...t, status: t._prevStatus || t.status } : t
      ));
      showToast(err.message || 'Failed to update status', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  const assignTicket = useCallback(async (id, agentId) => {
    try {
      await ticketApi.updateTicket(id, { assignedTo: agentId || null });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo: agentId || null } : t)));
      const agent = agents.find((u) => u.id === agentId);
      showToast(`Assigned to ${agent ? agent.name : 'unassigned'}`, 'fa-user-tag');
    } catch (err) {
      showToast(err.message || 'Failed to assign ticket', 'fa-triangle-exclamation');
    }
  }, [agents, showToast]);

  const addComment = useCallback(async (id, { authorId, text }) => {
    try {
      const comment = await ticketApi.addComment(id, text);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, comments: [...(t.comments || []), comment], commentCount: (t.commentCount || 0) + 1 }
            : t
        )
      );
      return comment;
    } catch (err) {
      showToast(err.message || 'Failed to add comment', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  // ===== NOTIFICATIONS =====

  const sendNotification = useCallback(async (notif, currentUser, recipientCount) => {
    try {
      const record = await notifApi.sendEmailNotification(notif);
      const formId = extractFormId(notif.body);
      const attachedForm = formId ? forms.find((f) => f.id === formId) : null;
      const enriched = { ...record, formId: formId || null, formName: attachedForm?.name || null };
      setNotifications((prev) => [enriched, ...prev]);
      showToast(`Notification sent to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`, 'fa-paper-plane');
      return enriched;
    } catch (err) {
      showToast(err.message || 'Failed to send notification', 'fa-triangle-exclamation');
    }
  }, [showToast, forms]);

  // ===== FORMS =====

  const saveForm = useCallback(async (form, currentUser) => {
    try {
      if (form.id) {
        const updated = await formApi.updateForm(form.id, form);
        setForms((prev) => prev.map((f) => (f.id === form.id ? updated : f)));
        showToast(`Form "${updated.name}" updated`);
        return updated;
      }
      const created = await formApi.createForm(form, currentUser);
      setForms((prev) => [created, ...prev]);
      showToast(`Form "${created.name}" created`);
      return created;
    } catch (err) {
      showToast(err.message || 'Failed to save form', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  const deleteForm = useCallback(async (id) => {
    try {
      await formApi.deleteForm(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
      showToast('Form deleted', 'fa-trash');
    } catch (err) {
      showToast(err.message || 'Failed to delete form', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  const addFormResponse = useCallback((entry) => {
    const record = { ...entry, id: `fr_${Date.now()}` };
    setFormResponses((prev) => {
      const next = [...prev, record];
      try { localStorage.setItem('gcat:formResponses', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const submitFormResponse = useCallback(async (formId, values, context = null) => {
    try {
      await formApi.submitForm(formId, values);
    } catch (err) {
      console.error('Form submit (API) failed:', err);
    }
    if (context?.notifId && context?.recipientId) {
      addFormResponse({
        formId,
        notifId: context.notifId,
        recipientId: context.recipientId,
        values,
        submittedAt: new Date().toISOString(),
      });
    }
  }, [addFormResponse]);

  // ===== MANAGED USERS =====

  const addManagedUser = useCallback((userData) => {
    const newUser = { ...userData, id: `mu_${Date.now()}` };
    setManagedUsers((prev) => [newUser, ...prev]);
    showToast(`${newUser.name} added`, 'fa-user-check');
    return newUser;
  }, [showToast]);

  const updateManagedUser = useCallback((id, patch) => {
    setManagedUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    showToast('User updated', 'fa-user-pen');
  }, [showToast]);

  const deleteManagedUser = useCallback((id) => {
    setManagedUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('User deleted', 'fa-trash');
  }, [showToast]);

  const resetAll = useCallback(() => {
    fetchedRef.current = false;
    usersLoadedRef.current = false;
    agentsLoadedRef.current = false;
    contactsLoadedRef.current = false;
    setManagedUsers(SEED_MANAGED_USERS);
    setFormResponses([]);
    try { localStorage.removeItem('gcat:formResponses'); } catch {}
    loadCore();
  }, []);

  return (
    <DataContext.Provider
      value={{
        tickets, notifications, forms,
        ticketTypes: TICKET_TYPES,
        loading,
        users, loadUsers,
        agents, loadAgents,
        managedUsers, addManagedUser, updateManagedUser, deleteManagedUser,
        formResponses, addFormResponse, submitFormResponse,
        managers, owners, horses, shows, championships, locations, contacts,
        contactsLoading, loadContacts,
        toast, showToast,
        createTicket, updateTicket, updateTicketStatus, assignTicket, addComment,
        sendNotification,
        saveForm, deleteForm,
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
