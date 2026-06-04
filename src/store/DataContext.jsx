import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as ticketApi from '../services/tickets.js';
import * as notifApi from '../services/notifications.js';
import * as formApi from '../services/forms.js';
import * as userApi from '../services/users.js';
import { fetchCoreData, fetchUsers, fetchAgents, fetchManagedUsersAndRoles, fetchContacts, extractFormId } from '../services/data.js';

const DataContext = createContext(null);

const TICKET_TYPES = ['Bug', 'Task'];

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

  // ── Managed users: User Management page ──────────────────────────────────
  const [managedUsers, setManagedUsers] = useState([]);
  const [managedUsersLoading, setManagedUsersLoading] = useState(false);
  const managedUsersLoadedRef = useRef(false);
  const [roles, setRoles] = useState([]);


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
      setManagedUsers([]); setRoles([]);
      fetchedRef.current = false;
      usersLoadedRef.current = false;
      agentsLoadedRef.current = false;
      contactsLoadedRef.current = false;
      managedUsersLoadedRef.current = false;
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
      const { tickets, notifications, forms } = await fetchCoreData();
      setTickets(tickets);
      setNotifications(notifications);
      setForms(forms);
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
      setUsers(await fetchUsers());
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
      setAgents(await fetchAgents());
    } catch (err) {
      console.error('Failed to load agents:', err);
      agentsLoadedRef.current = false;
    }
  }, []);

  // ── Lazy: managed users + roles — Users page ──────────────────────────────
  const loadManagedUsers = useCallback(async () => {
    if (managedUsersLoadedRef.current) return;
    managedUsersLoadedRef.current = true;
    setManagedUsersLoading(true);
    try {
      const { users: items, roles: roleList } = await fetchManagedUsersAndRoles();
      setManagedUsers(items);
      setRoles(roleList);
    } catch (err) {
      console.error('Failed to load managed users:', err);
      managedUsersLoadedRef.current = false;
    } finally {
      setManagedUsersLoading(false);
    }
  }, []);

  // ── Lazy: contacts — Notifications page ──────────────────────────────────
  const loadContacts = useCallback(async () => {
    if (contactsLoadedRef.current) return;
    contactsLoadedRef.current = true;
    setContactsLoading(true);
    try {
      const result = await fetchContacts(users);
      setManagers(result.managers);
      setOwners(result.owners);
      setHorses(result.horses);
      setShows(result.shows);
      setChampionships(result.championships);
      setLocations(result.locations);
      setContacts(result.contacts);
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
      const record = await notifApi.sendNotification(notif);
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

  const submitFormResponse = useCallback(async (formId, values, context = null) => {
    // Throws on failure (invalid/expired token, already submitted) — FormView catches it
    await formApi.submitForm(formId, values, {
      email: context?.email || '',
      name: context?.name || '',
      token: context?.token || null,
    });

    // Mark recipient as submitted in the in-memory notifications state so
    // FormTracking updates immediately without requiring a page refresh
    if (context?.notifId && context?.recipientId) {
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => {
        if (n.id !== context.notifId) return n;
        return {
          ...n,
          recipients: (n.recipients || []).map((r) =>
            r.id === context.recipientId
              ? { ...r, isFormSubmitted: true, formSubmittedAt: now }
              : r,
          ),
        };
      }));
    }
  }, []);

  // ===== MANAGED USERS =====

  const addManagedUser = useCallback(async (req) => {
    const newUser = await userApi.createUser(req);
    setManagedUsers((prev) => [newUser, ...prev]);
    showToast(`${newUser.name} added`, 'fa-user-check');
    return newUser;
  }, [showToast]);

  const updateManagedUser = useCallback(async (id, req) => {
    const updated = await userApi.updateUser(id, req);
    setManagedUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    showToast('User updated', 'fa-user-pen');
    return updated;
  }, [showToast]);

  const deleteManagedUser = useCallback(async (id) => {
    await userApi.deleteUser(id);
    setManagedUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('User deleted', 'fa-trash');
  }, [showToast]);

  const resetAll = useCallback(() => {
    fetchedRef.current = false;
    usersLoadedRef.current = false;
    agentsLoadedRef.current = false;
    contactsLoadedRef.current = false;
    managedUsersLoadedRef.current = false;
    setManagedUsers([]);
    setRoles([]);
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
        managedUsers, managedUsersLoading, loadManagedUsers,
        roles,
        addManagedUser, updateManagedUser, deleteManagedUser,
        submitFormResponse,
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
