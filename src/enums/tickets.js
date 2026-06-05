import { toOptions } from '../utils/selectStyles.js';

export const TICKET_TYPES = ['Bug', 'Task'];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PRIORITY_OPTS        = toOptions(PRIORITIES);
export const PRIORITY_FILTER_OPTS = toOptions(PRIORITIES, 'All priorities');

export const STATUSES = [
  { key: 'open',      label: 'Open'        },
  { key: 'progress',  label: 'In Progress' },
  { key: 'completed', label: 'Completed'   },
];
export const STATUS_OPTS = toOptions(
  STATUSES.map((s) => ({ value: s.key, label: s.label })),
  'All statuses'
);

export const TYPE_META = {
  Bug:  { icon: 'fa-bug',        bg: '#fee2e2', color: '#b91c1c' },
  Task: { icon: 'fa-list-check', bg: '#dbeafe', color: '#1d4ed8' },
};

export const STATUS_FROM_BACKEND = { Open: 'open', InProgress: 'progress', Completed: 'completed' };
export const STATUS_TO_BACKEND   = { open: 'Open', progress: 'InProgress', completed: 'Completed' };
