/**
 * Single source of truth for every status lifecycle in MediCare Sync.
 *
 * These tables DESCRIBE behaviour that already exists in the database functions
 * (drizzle/migrations/*.sql) and the UI. They do not change it. Parity with the
 * SQL is checked by src/lib/state-machines.test.ts, so drift fails CI.
 *
 * Reading guide (also in docs/state-machines.md):
 *  - `guard: "database"`  the RPC rejects illegal transitions (authoritative).
 *  - `guard: "ui"`        only the UI limits transitions; the database accepts more.
 *  - `guard: "none"`      any value in the CHECK list may be written directly.
 */

export type Guard = "database" | "ui" | "none";

export type Transition<S extends string, A extends string, Actor extends string = never> = {
  readonly from: S;
  readonly action: A;
  readonly to: S;
  /** Who may perform it. Omitted = any facility user permitted by row-level rules. */
  readonly actors?: readonly Actor[];
};

export type MachineSpec<S extends string, A extends string, Actor extends string = never> = {
  readonly name: string;
  readonly table: string;
  readonly guard: Guard;
  readonly initial: S;
  readonly states: Readonly<Record<S, { label: string; terminal?: boolean }>>;
  readonly transitions: readonly Transition<S, A, Actor>[];
};

export function defineMachine<S extends string, A extends string, Actor extends string = never>(
  spec: MachineSpec<S, A, Actor>,
) {
  const stateList = Object.keys(spec.states) as S[];
  const isState = (value: string): value is S => value in spec.states;
  const from = (state: string) => (isState(state) ? spec.transitions.filter((t) => t.from === state) : []);
  return {
    ...spec,
    stateList,
    isState,
    /** Unknown statuses (older rows, future values) are treated as not open, never thrown on. */
    isTerminal: (state: string) => isState(state) && !!spec.states[state].terminal,
    isOpen: (state: string) => isState(state) && !spec.states[state].terminal,
    /** Non-terminal states, in declaration order. */
    openStates: stateList.filter((s) => !spec.states[s].terminal),
    label: (state: string) => (isState(state) ? spec.states[state].label : state),
    /** Transitions available from `state`, optionally narrowed to an actor. */
    actionsFrom: (state: string, actor?: Actor) =>
      from(state).filter((t) => !t.actors || actor === undefined || t.actors.includes(actor)),
    can: (state: string, action: A, actor?: Actor) =>
      from(state).some((t) => t.action === action && (!t.actors || actor === undefined || t.actors.includes(actor))),
    canMoveTo: (state: string, to: string) => from(state).some((t) => t.to === to),
    next: (state: string, action: A): S | null => from(state).find((t) => t.action === action)?.to ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Stock transfer between facilities  (stock_transfers.status)      */
/*    RPC: act_on_stock_transfer (0002). Guarded in the database.      */
/*    Side effect: stock moves sender -> receiver on APPROVE, not on   */
/*    dispatch or receive.                                             */
/* ------------------------------------------------------------------ */
export type TransferStatus = "pending" | "approved" | "packed" | "dispatched" | "received" | "rejected";
export type TransferAction = "approve" | "reject" | "pack" | "dispatch" | "receive";
export type TransferActor = "from" | "to";

export const stockTransfer = defineMachine<TransferStatus, TransferAction, TransferActor>({
  name: "Stock transfer",
  table: "stock_transfers",
  guard: "database",
  initial: "pending",
  states: {
    pending: { label: "Awaiting approval" },
    approved: { label: "Approved" },
    packed: { label: "Packed" },
    dispatched: { label: "Dispatched" },
    received: { label: "Received", terminal: true },
    rejected: { label: "Rejected", terminal: true },
  },
  transitions: [
    { from: "pending", action: "approve", to: "approved", actors: ["from"] },
    { from: "pending", action: "reject", to: "rejected", actors: ["from", "to"] },
    { from: "approved", action: "pack", to: "packed", actors: ["from"] },
    { from: "approved", action: "dispatch", to: "dispatched", actors: ["from"] },
    { from: "packed", action: "dispatch", to: "dispatched", actors: ["from"] },
    { from: "dispatched", action: "receive", to: "received", actors: ["to"] },
  ],
});
/** The happy-path order, for progress trackers. Rejected is a branch, not a step. */
export const TRANSFER_STEPS = ["pending", "approved", "packed", "dispatched", "received"] as const;

/* ------------------------------------------------------------------ */
/* 2. Patient collection request  (transfer_requests.status)           */
/*    RPC: act_on_patient_request. The UI enforces the order; the      */
/*    database accepts ANY of the four target values from ANY status.  */
/* ------------------------------------------------------------------ */
export type PatientRequestStatus = "sent" | "accepted" | "ready" | "completed" | "rejected";
export type PatientRequestAction = "accept" | "mark_ready" | "collect" | "reject";

export const patientRequest = defineMachine<PatientRequestStatus, PatientRequestAction>({
  name: "Patient request",
  table: "transfer_requests",
  guard: "ui",
  initial: "sent",
  states: {
    sent: { label: "Sent — waiting for the hospital" },
    accepted: { label: "Accepted by the hospital" },
    ready: { label: "Ready for collection" },
    completed: { label: "Collected", terminal: true },
    rejected: { label: "Declined — please contact your clinic", terminal: true },
  },
  transitions: [
    { from: "sent", action: "accept", to: "accepted" },
    { from: "accepted", action: "mark_ready", to: "ready" },
    { from: "ready", action: "collect", to: "completed" },
    { from: "sent", action: "reject", to: "rejected" },
    { from: "accepted", action: "reject", to: "rejected" },
    { from: "ready", action: "reject", to: "rejected" },
  ],
});

/* ------------------------------------------------------------------ */
/* 3. Mobile clinic request  (mobile_requests.status)                  */
/*    RPC: update_mobile_request (0003). Guarded in the database.      */
/*    Side effects: stock leaves the van on "Ready on vehicle" and is  */
/*    returned if a ready request becomes "Not available".             */
/* ------------------------------------------------------------------ */
export type MobileRequestStatus = "Submitted" | "Preparing" | "Ready on vehicle" | "Collected" | "Not available";
export type MobileRequestAction = "prepare" | "load" | "collect" | "cancel";

export const mobileRequest = defineMachine<MobileRequestStatus, MobileRequestAction>({
  name: "Mobile clinic request",
  table: "mobile_requests",
  guard: "database",
  initial: "Submitted",
  states: {
    Submitted: { label: "Submitted" },
    Preparing: { label: "Preparing" },
    "Ready on vehicle": { label: "Ready on vehicle" },
    Collected: { label: "Collected", terminal: true },
    "Not available": { label: "Not available", terminal: true },
  },
  transitions: [
    { from: "Submitted", action: "prepare", to: "Preparing" },
    { from: "Submitted", action: "cancel", to: "Not available" },
    { from: "Preparing", action: "load", to: "Ready on vehicle" },
    { from: "Preparing", action: "cancel", to: "Not available" },
    { from: "Ready on vehicle", action: "collect", to: "Collected" },
    { from: "Ready on vehicle", action: "cancel", to: "Not available" },
  ],
});
/** The forward step for each status (what the primary button does). */
export const MOBILE_REQUEST_NEXT: Readonly<Record<string, string>> = Object.fromEntries(
  mobileRequest.transitions.filter((t) => t.action !== "cancel").map((t) => [t.from, t.to]),
);

/* ------------------------------------------------------------------ */
/* 4. Mobile clinic journey  (mobile_clinics.status)                   */
/*    Written directly by the client. Any value may follow any value;  */
/*    the table lists the intended journey plus "restart".             */
/* ------------------------------------------------------------------ */
export type ClinicStatus = "Loading" | "En route" | "Arrived" | "Completed";

export const mobileClinic = defineMachine<ClinicStatus, "depart" | "arrive" | "complete" | "restart">({
  name: "Mobile clinic journey",
  table: "mobile_clinics",
  guard: "none",
  initial: "Loading",
  states: {
    Loading: { label: "Loading" },
    "En route": { label: "En route" },
    Arrived: { label: "Arrived" },
    Completed: { label: "Completed" },
  },
  transitions: [
    { from: "Loading", action: "depart", to: "En route" },
    { from: "En route", action: "arrive", to: "Arrived" },
    { from: "Arrived", action: "complete", to: "Completed" },
    { from: "Completed", action: "restart", to: "Loading" },
  ],
});
/** Buttons in the UI offer every status today; keep that until the database guards it. */
export const CLINIC_STATUSES = mobileClinic.stateList;

/* ------------------------------------------------------------------ */
/* 5. Facility notification  (notifications.status)                    */
/*    RPC: notification_action (0002) + mark_all_read.                 */
/*    "accept" only applies to kind = expiry_suggestion and creates    */
/*    a transfer. "dismiss" is accepted from every status.             */
/* ------------------------------------------------------------------ */
export type NotificationStatus = "unread" | "read" | "dismissed" | "accepted";
export type NotificationAction = "read" | "dismiss" | "accept";

export const notification = defineMachine<NotificationStatus, NotificationAction>({
  name: "Notification",
  table: "notifications",
  guard: "database",
  initial: "unread",
  states: {
    unread: { label: "Unread" },
    read: { label: "Read" },
    accepted: { label: "Accepted", terminal: true },
    dismissed: { label: "Dismissed", terminal: true },
  },
  transitions: [
    { from: "unread", action: "read", to: "read" },
    { from: "unread", action: "dismiss", to: "dismissed" },
    { from: "read", action: "dismiss", to: "dismissed" },
    { from: "unread", action: "accept", to: "accepted" },
    { from: "read", action: "accept", to: "accepted" },
  ],
});

/* ------------------------------------------------------------------ */
/* 6. Device-saved action  (localStorage DeviceAction.synced/.error)   */
/*    Derived: the record stores two fields; this names the state.     */
/*    pending -> synced, pending -> paused (server refused), and       */
/*    paused -> pending when the user taps "Sync now".                 */
/* ------------------------------------------------------------------ */
export type DeviceActionState = "pending" | "paused" | "synced";
export const deviceActionState = (a: { synced?: boolean; error?: string }): DeviceActionState =>
  a.synced ? "synced" : a.error ? "paused" : "pending";

/** Everything with a database-backed lifecycle, for docs, tooling and agents. */
export const ALL_MACHINES = [stockTransfer, patientRequest, mobileRequest, mobileClinic, notification] as const;
