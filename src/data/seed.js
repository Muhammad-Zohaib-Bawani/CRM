// Seed data for the GCAT CRM prototype.
// Equestrian/Arabian-tour domain: horses, owners, managers, shows, locations.

export const USERS = [
  { id: 'u-admin-1', name: 'Layla Al-Mansoori', email: 'admin@gcat.app', role: 'admin', initials: 'LA' },
  { id: 'u-admin-2', name: 'Hassan Al-Maktoum', email: 'hassan@gcat.app', role: 'admin', initials: 'HM' },
  { id: 'u-agent-1', name: 'Omar Khalifa', email: 'omar@gcat.app', role: 'agent', initials: 'OK' },
  { id: 'u-agent-2', name: 'Sara Vance', email: 'sara@gcat.app', role: 'agent', initials: 'SV' },
  { id: 'u-agent-3', name: 'Diego Ferrari', email: 'diego@gcat.app', role: 'agent', initials: 'DF' },
];

export const MANAGERS = [
  { id: 'm-1', name: 'Rashid Al-Nahyan', email: 'rashid@alshaqab.ae',     stable: 'Al Shaqab Stables',   location: 'Doha, Qatar',   status: 'Active' },
  { id: 'm-2', name: 'Catherine Whitcomb', email: 'catherine@whitcomb.us', stable: 'Whitcomb Equestrian', location: 'Wellington, USA', status: 'Active' },
  { id: 'm-3', name: 'Pierre Dubois', email: 'pierre@versailles.fr',       stable: 'Haras de Versailles', location: 'Paris, France',  status: 'Active' },
  { id: 'm-4', name: 'Anya Petrov', email: 'anya@petrov-bloodstock.com',   stable: 'Petrov Bloodstock',   location: 'Verona, Italy',  status: 'Pending' },
];

export const OWNERS = [
  { id: 'o-1', name: 'HH Sheikh Mohammed', email: 'office@maktoum.ae',     country: 'UAE',    location: 'Dubai, UAE',     status: 'Active' },
  { id: 'o-2', name: 'Royal Cavalry of Oman', email: 'cavalry@oman.gov.om', country: 'Oman',   location: 'Muscat, Oman',   status: 'Active' },
  { id: 'o-3', name: 'Whitcomb Stables LLC', email: 'admin@whitcomb.us',   country: 'USA',    location: 'Wellington, USA', status: 'Active' },
  { id: 'o-4', name: 'Romano Family Trust', email: 'trust@romano.it',      country: 'Italy',  location: 'Verona, Italy',  status: 'Inactive' },
  { id: 'o-5', name: 'Dubois Bloodlines', email: 'contact@dubois.fr',      country: 'France', location: 'Paris, France',  status: 'Active' },
];

// Combined recipient pool — every contact that can receive a notification.
// userType is the canonical filter axis (Admin / Agent / Manager / Owner).
export const CONTACTS = [
  ...USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    userType: u.role === 'admin' ? 'Admin' : 'Agent',
    status: 'Active',
    location: '',
    initials: u.initials,
  })),
  ...MANAGERS.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    userType: 'Manager',
    status: m.status,
    location: m.location,
    stable: m.stable,
    initials: m.name.split(' ').map((p) => p[0]).slice(0, 2).join(''),
  })),
  ...OWNERS.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    userType: 'Owner',
    status: o.status,
    location: o.location,
    country: o.country,
    initials: o.name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
  })),
];

export const HORSES = [
  { id: 'h-1', name: 'Asfan Al-Bahar', gender: 'Male', owner: 'o-1', age: 7 },
  { id: 'h-2', name: 'Najma Bint Sahara', gender: 'Female', owner: 'o-1', age: 5 },
  { id: 'h-3', name: 'Royal Tempest', gender: 'Male', owner: 'o-3', age: 8 },
  { id: 'h-4', name: 'Bella Donna', gender: 'Female', owner: 'o-4', age: 6 },
  { id: 'h-5', name: 'Le Vainqueur', gender: 'Male', owner: 'o-5', age: 9 },
  { id: 'h-6', name: 'Princess Layali', gender: 'Female', owner: 'o-2', age: 4 },
];

export const SHOWS = [
  { id: 's-1', name: 'Dubai International Arabian Horse Championship', date: '2026-03-12' },
  { id: 's-2', name: 'Menton Mediterranean Championship', date: '2026-04-22' },
  { id: 's-3', name: 'Las Vegas World Cup', date: '2026-05-18' },
  { id: 's-4', name: 'Paris Salon du Cheval', date: '2026-06-09' },
];

export const CHAMPIONSHIPS = [
  { id: 'c-1', name: 'World Arabian Horse Championship 2026' },
  { id: 'c-2', name: 'Tier 1 European Cup' },
  { id: 'c-3', name: 'Middle East Triple Crown' },
];

export const LOCATIONS = [
  'Dubai, UAE',
  'Abu Dhabi, UAE',
  'Doha, Qatar',
  'Muscat, Oman',
  'Menton, France',
  'Paris, France',
  'Las Vegas, USA',
  'Wellington, USA',
  'Verona, Italy',
];

export const TICKET_TYPES = ['Bug', 'Task'];

// Date helpers so seed tickets stay "fresh" relative to today.
const today = new Date();
const iso = (d) => d.toISOString();
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
const atTime = (d, h, m = 0) => {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
};

export const SEED_TICKETS = [
  // Two created today so the "Today's tickets" widget has data
  {
    id: 'TKT-1001',
    title: 'Kanban drag-drop stalls on Safari',
    description: 'Reproducible on Safari 17.4 — moving a card to "Completed" triggers a re-render loop. Console shows no errors. Affects only Safari.',
    type: 'Bug',
    priority: 'High',
    status: 'open',
    createdBy: 'u-admin-1',
    assignedTo: 'u-agent-1',
    dueDate: iso(addDays(2)).slice(0, 10),
    attachments: [{ name: 'safari-console.log', size: 12480 }],
    createdAt: iso(atTime(today, 9, 14)),
    updatedAt: iso(atTime(today, 9, 14)),
    comments: [],
  },
  {
    id: 'TKT-1002',
    title: 'Add CSV export to ticket list',
    description: 'Stakeholders want to export the filtered ticket list as CSV. Include all visible columns.',
    type: 'Task',
    priority: 'Medium',
    status: 'open',
    createdBy: 'u-admin-2',
    assignedTo: null,
    dueDate: iso(addDays(10)).slice(0, 10),
    attachments: [],
    createdAt: iso(atTime(today, 11, 30)),
    updatedAt: iso(atTime(today, 11, 30)),
    comments: [],
  },
  {
    id: 'TKT-1003',
    title: 'Notification rich-text editor strips inline styles on paste',
    description: 'When pasting from Google Docs, all bold/italic styling is lost. Plain text comes through correctly.',
    type: 'Bug',
    priority: 'Urgent',
    status: 'progress',
    createdBy: 'u-admin-1',
    assignedTo: 'u-agent-2',
    dueDate: iso(addDays(1)).slice(0, 10),
    attachments: [
      { name: 'paste-before.png', size: 84210 },
      { name: 'paste-after.png', size: 79110 },
    ],
    createdAt: iso(atTime(addDays(-2), 15, 20)),
    updatedAt: iso(atTime(addDays(-1), 10, 15)),
    comments: [
      { id: 'cm-1', authorId: 'u-agent-2', text: 'Reproduced — looks like the paste handler is calling removeFormat.', at: iso(atTime(addDays(-1), 10, 15)) },
    ],
  },
  {
    id: 'TKT-1004',
    title: 'Set up nightly backup of localStorage seed',
    description: 'Add a daily job that exports a JSON snapshot of all CRM data.',
    type: 'Task',
    priority: 'Medium',
    status: 'progress',
    createdBy: 'u-admin-1',
    assignedTo: 'u-agent-3',
    dueDate: iso(addDays(7)).slice(0, 10),
    attachments: [],
    createdAt: iso(atTime(addDays(-4), 8, 0)),
    updatedAt: iso(atTime(addDays(-1), 16, 45)),
    comments: [
      { id: 'cm-2', authorId: 'u-agent-3', text: 'Draft script in review, will deploy by EOW.', at: iso(atTime(addDays(-1), 16, 45)) },
    ],
  },
  {
    id: 'TKT-1005',
    title: 'Dashboard stat cards overflow on tablet',
    description: 'On widths between 768 and 900px the four stat cards wrap to two rows but the icons clip on the right edge.',
    type: 'Bug',
    priority: 'Low',
    status: 'open',
    createdBy: 'u-admin-1',
    assignedTo: null,
    dueDate: iso(addDays(14)).slice(0, 10),
    attachments: [],
    createdAt: iso(atTime(addDays(-3), 13, 0)),
    updatedAt: iso(atTime(addDays(-3), 13, 0)),
    comments: [],
  },
  {
    id: 'TKT-1006',
    title: 'Wire up form submission to backend webhook',
    description: 'Dynamic Forms currently store responses in localStorage. Add a webhook URL setting so submissions also POST to an external endpoint.',
    type: 'Task',
    priority: 'Medium',
    status: 'completed',
    createdBy: 'u-admin-2',
    assignedTo: 'u-agent-1',
    dueDate: iso(addDays(-3)).slice(0, 10),
    attachments: [{ name: 'webhook-spec.pdf', size: 256000 }],
    createdAt: iso(atTime(addDays(-12), 9, 30)),
    updatedAt: iso(atTime(addDays(-4), 17, 0)),
    comments: [
      { id: 'cm-3', authorId: 'u-agent-1', text: 'Shipped and verified end-to-end.', at: iso(atTime(addDays(-4), 17, 0)) },
    ],
  },
  {
    id: 'TKT-1007',
    title: 'Audit role-based permissions across all routes',
    description: 'Walk every page and confirm Admin/Agent gating matches the permission matrix in the README.',
    type: 'Task',
    priority: 'High',
    status: 'completed',
    createdBy: 'u-admin-2',
    assignedTo: 'u-agent-1',
    dueDate: iso(addDays(-7)).slice(0, 10),
    attachments: [],
    createdAt: iso(atTime(addDays(-15), 7, 0)),
    updatedAt: iso(atTime(addDays(-8), 18, 0)),
    comments: [
      { id: 'cm-4', authorId: 'u-agent-1', text: 'Audit complete — see commit log for the gates I added.', at: iso(atTime(addDays(-8), 18, 0)) },
    ],
  },
];

export const SEED_FORMS = [
  {
    id: 'frm-1001',
    name: 'Horse Arrival Checklist',
    createdBy: 'u-admin-1',
    createdAt: '2026-05-15T10:00:00Z',
    fields: [
      { id: 'f1', name: 'Horse Name', placeholder: 'e.g. Asfan Al-Bahar', type: 'text', sort: 1 },
      { id: 'f2', name: 'Arrival Date', placeholder: '', type: 'date', sort: 2 },
      { id: 'f3', name: 'Arrival Time', placeholder: '', type: 'time', sort: 3 },
      { id: 'f4', name: 'Vaccination certificate received', placeholder: '', type: 'toggle', sort: 4 },
      {
        id: 'f5',
        name: 'Items inspected on arrival',
        placeholder: '',
        type: 'checkbox',
        sort: 5,
        options: ['Tack & saddlery', 'Travel boots', 'Feed supply', 'Water container', 'Health documents'],
      },
      {
        id: 'f6',
        name: 'Preferred bedding',
        placeholder: '',
        type: 'select',
        sort: 6,
        options: ['Straw', 'Shavings', 'Hemp', 'Paper'],
      },
      { id: 'f7', name: 'Notes', placeholder: 'Any observations from the journey', type: 'textarea', sort: 7 },
    ],
  },
];

export const SEED_NOTIFICATIONS = [
  {
    id: 'nt-1001',
    subject: 'Spring Championship — Schedule Update',
    body: '<h2>Dear Owners and Managers,</h2><p>Please find attached the <strong>updated schedule</strong> for the upcoming Spring Championship. Briefing at 08:00 sharp.</p><p>With warm regards,<br/>GCAT Operations</p>',
    filters: { roles: [], shows: ['s-1'], championships: [], owners: [], managers: [], horseGenders: [], locations: [], statuses: [] },
    attachments: [{ name: 'spring-schedule.pdf', size: 482113 }],
    sentBy: 'u-admin-1',
    sentAt: '2026-05-22T09:00:00Z',
    recipientCount: 4,
  },
];
