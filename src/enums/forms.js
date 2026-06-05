export const FIELD_TYPES = [
  { type: 'text',     label: 'Free Text',          icon: 'fa-font'         },
  { type: 'textarea', label: 'Long Text',           icon: 'fa-align-left'   },
  { type: 'toggle',   label: 'Toggle (Yes/No)',     icon: 'fa-toggle-on'    },
  { type: 'checkbox', label: 'Checkboxes (multi)',  icon: 'fa-square-check' },
  { type: 'date',     label: 'Date Picker',         icon: 'fa-calendar'     },
  { type: 'time',     label: 'Time Picker',         icon: 'fa-clock'        },
  { type: 'number',   label: 'Number',              icon: 'fa-hashtag'      },
  { type: 'email',    label: 'Email',               icon: 'fa-envelope'     },
  { type: 'select',   label: 'Dropdown',            icon: 'fa-list'         },
  { type: 'other',    label: 'Other (Custom)',       icon: 'fa-plus'         },
];

export const TYPES_WITH_OPTIONS = ['select', 'checkbox'];

export const FIELD_TYPE_OPTS = FIELD_TYPES.map((ft) => ({ value: ft.type, label: ft.label }));

export const DATE_VALIDATION_OPTS = [
  { v: '',            l: 'No restriction',    icon: 'fa-infinity'    },
  { v: 'blockPast',   l: 'Block past dates',  icon: 'fa-arrow-right' },
  { v: 'blockFuture', l: 'Block future dates', icon: 'fa-arrow-left'  },
];
