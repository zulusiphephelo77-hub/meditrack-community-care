# State machines

Every status lifecycle in the app, in one place. Code: `src/lib/state-machines.ts`.
Parity with the database is enforced by `src/lib/state-machines.test.ts` (it parses the migrations), so a change to either side that isn't mirrored fails `bun run test`.

`guard` tells you who enforces the rules: **database** (RPC rejects illegal moves), **ui** (only the UI limits moves), **none** (any allowed value can be written).

| Machine | Table / storage | Guard | Flow |
|---|---|---|---|
| Stock transfer | `stock_transfers` via `act_on_stock_transfer` | database | pending → approved → (packed) → dispatched → received; pending → rejected |
| Patient request | `transfer_requests` via `act_on_patient_request` | **ui** | sent → accepted → ready → completed; reject while open |
| Mobile request | `mobile_requests` via `update_mobile_request` | database | Submitted → Preparing → Ready on vehicle → Collected; any open → Not available |
| Mobile clinic journey | `mobile_clinics.status` (direct update) | **none** | Loading → En route → Arrived → Completed (UI offers every value) |
| Notification | `notifications` via `notification_action` | database | unread → read; unread/read → dismissed or accepted (expiry suggestions only) |
| Device action | localStorage `DeviceAction` | client | pending → synced, pending → paused (server refused) → pending on "Sync now" |
| Connectivity | `src/lib/connectivity.ts` | client | online / manual-offline / offline; server calls only when online |

## Side effects to remember
- Stock transfer: stock moves sender → receiver on **approve**, not on dispatch/receive.
- Mobile request: van stock is deducted on **Ready on vehicle** and returned if a ready request becomes **Not available**.
- Expiry-suggestion accept creates a transfer in `pending` and notifies the receiver.

## Other implicit states (documented, not extracted)
- Session: signed-out → patient | facility (`requireRole`); the offline route additionally accepts a previously verified facility session while offline.
- Workspace source in `facility.tsx`: live network data vs cached stock-only snapshot.
- Simulated clock: `sim_clock.offset_days`; use `net.today`, never `new Date()`, on facility screens.
- Automation engine: `run_automation` on load and every 30 s, idempotent via notification dedupe keys.
- Login forms: idle / busy / error, held in separate `useState`s.

## Rules for changing a lifecycle
1. Change the SQL (new migration) **and** the table in `state-machines.ts`; run the tests.
2. Drive buttons from `machine.can(status, action, actor)`, not from literal status comparisons.
3. Unknown statuses are treated as not open; never throw on them.
4. Known gaps are listed in `docs/proposed/0005_guard_lifecycles.sql`; apply it only after review.
