import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as ticketApi from '../services/tickets.js';
import * as notifApi from '../services/notifications.js';
import * as formApi from '../services/forms.js';
import * as userApi from '../services/users.js';
import { fetchUsers, fetchAgents, fetchManagedUsersAndRoles, fetchContacts } from '../services/data.js';
import { TICKET_TYPES } from '../enums/tickets.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

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

  const showToast = useCallback((message, icon = 'fa-circle-check') => {
    setToast({ message, icon, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Clear lazy caches on logout
  useEffect(() => {
    if (!user) {
      setUsers([]); setAgents([]);
      setManagers([]); setOwners([]); setHorses([]); setShows([]);
      setChampionships([]); setLocations([]); setContacts([]);
      setManagedUsers([]); setRoles([]);
      usersLoadedRef.current = false;
      agentsLoadedRef.current = false;
      contactsLoadedRef.current = false;
      managedUsersLoadedRef.current = false;
    }
  }, [user]);

  // ── Lazy: users ───────────────────────────────────────────────────────────
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

  // ── Lazy: agents ──────────────────────────────────────────────────────────
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

  // ── Lazy: managed users + roles ───────────────────────────────────────────
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

  // ── Lazy: contacts ────────────────────────────────────────────────────────
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
      const attachmentsToSave = (input.attachments || []).filter((a) => a.url);
      if (attachmentsToSave.length) {
        await Promise.all(
          attachmentsToSave.map((a) =>
            ticketApi.addAttachment(ticket.id, { fileName: a.name, fileUrl: a.url, fileSize: a.size })
          )
        );
      }
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
      return updated;
    } catch (err) {
      showToast(err.message || 'Failed to update ticket', 'fa-triangle-exclamation');
      throw err;
    }
  }, [showToast]);

  const updateTicketStatus = useCallback(async (id, status) => {
    try {
      await ticketApi.updateTicket(id, { status });
      showToast(`Ticket moved to ${statusLabel(status)}`);
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'fa-triangle-exclamation');
      throw err;
    }
  }, [showToast]);

  const assignTicket = useCallback(async (id, agentId) => {
    try {
      await ticketApi.updateTicket(id, { assignedTo: agentId || null });
      const agent = agents.find((u) => u.id === agentId);
      showToast(`Assigned to ${agent ? agent.name : 'unassigned'}`, 'fa-user-tag');
    } catch (err) {
      showToast(err.message || 'Failed to assign ticket', 'fa-triangle-exclamation');
    }
  }, [agents, showToast]);

  const addComment = useCallback(async (id, { authorId, text }) => {
    try {
      return await ticketApi.addComment(id, text);
    } catch (err) {
      showToast(err.message || 'Failed to add comment', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  // ===== NOTIFICATIONS =====

  const sendNotification = useCallback(async (notif, currentUser, recipientCount) => {
    try {
      const record = await notifApi.sendNotification(notif);
      showToast(`Notification sent to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`, 'fa-paper-plane');
      return record;
    } catch (err) {
      showToast(err.message || 'Failed to send notification', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  // ===== FORMS =====

  const saveForm = useCallback(async (form) => {
    try {
      if (form.id) {
        const updated = await formApi.updateForm(form.id, form);
        showToast(`Form "${updated.name}" updated`);
        return updated;
      }
      const created = await formApi.createForm(form);
      showToast(`Form "${created.name}" created`);
      return created;
    } catch (err) {
      showToast(err.message || 'Failed to save form', 'fa-triangle-exclamation');
    }
  }, [showToast]);

  const deleteForm = useCallback(async (id) => {
    try {
      await formApi.deleteForm(id);
      showToast('Form deleted', 'fa-trash');
    } catch (err) {
      showToast(err.message || 'Failed to delete form', 'fa-triangle-exclamation');
      throw err;
    }
  }, [showToast]);

  const submitFormResponse = useCallback(async (formId, values, context = null) => {
    await formApi.submitForm(formId, values, {
      email: context?.email || '',
      name: context?.name || '',
      token: context?.token || null,
    });
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
    usersLoadedRef.current = false;
    agentsLoadedRef.current = false;
    contactsLoadedRef.current = false;
    managedUsersLoadedRef.current = false;
    setManagedUsers([]);
    setRoles([]);
  }, []);

  return (
    <DataContext.Provider
      value={{
        ticketTypes: TICKET_TYPES,
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
