import { getTickets } from './tickets.js';
import { getNotifications } from './notifications.js';
import { getForms } from './forms.js';
import { getUsers, getAgents, getManagers, getOwners, getHorses, getShows, getChampionships, getLocations } from './contacts.js';
import { listUsers, getRoles } from './users.js';

export function extractFormId(html) {
  if (!html) return null;
  const m = html.match(/\/form\/([\w-]+)/);
  return m ? m[1] : null;
}

const settle = (r, fallback = []) => r.status === 'fulfilled' ? r.value : fallback;

export async function fetchCoreData() {
  const [ticketData, notifData, formData] = await Promise.allSettled([
    getTickets({ pageSize: 200 }),
    getNotifications(1, 200),
    getForms(1, 100),
  ]);
  const formList = settle(formData);
  const formMap = new Map(formList.map((f) => [f.id, f.name]));
  const notifications = settle(notifData).map((n) => {
    const fid = extractFormId(n.body);
    return { ...n, formId: fid, formName: fid ? (formMap.get(fid) || null) : null };
  });
  return { tickets: settle(ticketData), notifications, forms: formList };
}

export async function fetchUsers() {
  return getUsers();
}

export async function fetchAgents() {
  return getAgents();
}

export async function fetchManagedUsersAndRoles() {
  const [usersResult, rolesResult] = await Promise.allSettled([
    listUsers({ pageSize: 200 }),
    getRoles(),
  ]);
  return {
    users: usersResult.status === 'fulfilled' ? usersResult.value.items : [],
    roles: rolesResult.status === 'fulfilled' ? rolesResult.value : [],
  };
}

export async function fetchContacts(systemUsers = []) {
  const [managerData, ownerData, horseData, showData, champData, locationData] =
    await Promise.allSettled([
      getManagers(),
      getOwners(),
      getHorses(),
      getShows(),
      getChampionships(),
      getLocations(),
    ]);
  const managerList = settle(managerData);
  const ownerList = settle(ownerData);
  return {
    managers: managerList,
    owners: ownerList,
    horses: settle(horseData),
    shows: settle(showData),
    championships: settle(champData),
    locations: settle(locationData),
    contacts: [
      ...systemUsers.map((u) => ({ ...u, userType: u.role === 'admin' ? 'Admin' : 'Agent' })),
      ...managerList,
      ...ownerList,
    ],
  };
}
