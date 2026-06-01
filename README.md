# GCAT CRM — Frontend Prototype

A React + Vite frontend-only prototype of an operations CRM for the **Global Champions Arabians Tour**. All state lives in `localStorage` — no backend required.

## Modules

- **Auth** — role-based login (Admin / Agent / User) with seeded demo accounts
- **Ticketing** — list, card, and Kanban (drag-and-drop) views; filters by status, priority, type, assignee; create + assign + comment; role-aware actions
- **Notifications** — rich-text composer (bold/italic/headings/alignment/lists), multi-attachment, recipient filters (role, owner, manager, show, championship, horse gender, location, status), embeddable form links
- **Dynamic Forms** — drag-from-palette builder (free text, toggle, checkbox, date, time, number, email, dropdown, custom "other"); generated public URL embeddable in notifications
- **Dashboards** — per-role stats by status, recent tickets, quick actions

## Run

```bash
cd crm-prototype
npm install
npm run dev
```

Then open http://localhost:5173.

## Demo accounts

| Role  | Email              |
|-------|--------------------|
| Admin | `admin@gcat.ae`    |
| Agent | `omar@gcat.ae`     |
| User  | `fatima@owner.com` |

Any password works (the prototype skips auth verification).

## Role permissions

| Action                          | Admin | Agent | User |
|---------------------------------|:-----:|:-----:|:----:|
| View all tickets                |  ✅   |  ❌   |  ❌  |
| View assigned tickets only      |   —   |  ✅   |   —  |
| View own created tickets only   |   —   |   —   |  ✅  |
| Create ticket                   |  ✅   |  ❌   |  ✅  |
| Assign ticket to agent          |  ✅   |  ❌   |  ❌  |
| Change ticket status (drag/drop)|  ✅   |  ✅¹  |  ✅² |
| Add comments                    |  ✅   |  ✅   |  ✅  |
| Send notifications              |  ✅   |  ❌   |  ❌  |
| Build dynamic forms             |  ✅   |  ❌   |  ❌  |

¹ Agents can only move tickets assigned to them.
² Users can only move tickets they created.

## Reset demo data

Click the circular-arrow icon in the top bar (next to the bell) — this clears localStorage and reseeds.

## Tech

- React 18 + React Router 6
- Vite 5
- No UI library; theme handcrafted in `src/styles/global.css` (black + warm gold)
- `contentEditable` + `document.execCommand` for the rich text editor (zero dependencies)
- Native HTML5 drag-and-drop for the Kanban board
