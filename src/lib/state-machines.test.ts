import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_MACHINES, CLINIC_STATUSES, MOBILE_REQUEST_NEXT, TRANSFER_STEPS, deviceActionState,
  mobileClinic, mobileRequest, notification, patientRequest, stockTransfer,
} from "./state-machines";
import { connectivityMode } from "./connectivity";
import { OPEN_REQUEST, OPEN_TRANSFER } from "./network";
import { requestNext } from "./mobile";

const sql = (f: string) => readFileSync(resolve(process.cwd(), "drizzle/migrations", f), "utf8");
const m0002 = sql("0002_automation_engine.sql");
const m0003 = sql("0003_offline_orders_mobile_clinics.sql");
const m0001 = sql("0001_stock_transfers.sql");
const list = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
const pair = (t: { from: string; to: string }) => `${t.from}>${t.to}`;

describe("machine integrity", () => {
  it.each(ALL_MACHINES.map((m) => [m.name, m] as const))("%s: every transition uses declared states", (_n, m) => {
    for (const t of m.transitions) {
      expect(m.isState(t.from), `${t.from}`).toBe(true);
      expect(m.isState(t.to), `${t.to}`).toBe(true);
    }
    expect(m.isState(m.initial)).toBe(true);
  });
  it.each(ALL_MACHINES.map((m) => [m.name, m] as const))("%s: terminal states have no exits", (_n, m) => {
    for (const s of m.stateList.filter((x) => m.isTerminal(x))) expect(m.actionsFrom(s)).toEqual([]);
  });
});

describe("stock transfer", () => {
  it("follows pending → approved → packed → dispatched → received", () => {
    expect(stockTransfer.next("pending", "approve")).toBe("approved");
    expect(stockTransfer.next("approved", "pack")).toBe("packed");
    expect(stockTransfer.next("packed", "dispatch")).toBe("dispatched");
    expect(stockTransfer.next("approved", "dispatch")).toBe("dispatched");
    expect(stockTransfer.next("dispatched", "receive")).toBe("received");
  });
  it("only the right side may act", () => {
    expect(stockTransfer.can("pending", "approve", "from")).toBe(true);
    expect(stockTransfer.can("pending", "approve", "to")).toBe(false);
    expect(stockTransfer.can("pending", "reject", "to")).toBe(true);
    expect(stockTransfer.can("dispatched", "receive", "to")).toBe(true);
    expect(stockTransfer.can("dispatched", "receive", "from")).toBe(false);
  });
  it("keeps the exact open list the app already used", () => {
    expect(OPEN_TRANSFER).toEqual(["pending", "approved", "packed", "dispatched"]);
    expect([...TRANSFER_STEPS]).toEqual(["pending", "approved", "packed", "dispatched", "received"]);
  });
  it("matches act_on_stock_transfer in the database", () => {
    const fn = m0002.slice(m0002.indexOf("function public.act_on_stock_transfer"));
    const blocks = fn.split(/_action = '/).slice(1);
    const found = new Set<string>();
    for (const b of blocks) {
      const action = b.slice(0, b.indexOf("'"));
      const notIn = b.match(/t\.status not in \(([^)]*)\)/);
      const neq = b.match(/t\.status <> '(\w+)'/);
      const to = b.match(/set status = '(\w+)'/)?.[1];
      for (const from of notIn ? list(notIn[1]!) : [neq![1]!]) found.add(`${from}>${action}>${to}`);
    }
    const expected = new Set(stockTransfer.transitions.map((t) => `${t.from}>${t.action}>${t.to}`));
    expect(found).toEqual(expected);
  });
  it("0001 defined the pre-packing lifecycle that 0002 replaced", () => {
    expect(m0001).toContain("Only approved transfers can be dispatched");
    expect(m0002).toContain("Only approved or packed transfers can be dispatched");
  });
});

describe("patient request", () => {
  it("is the sent → accepted → ready → completed path with reject while open", () => {
    expect(patientRequest.next("sent", "accept")).toBe("accepted");
    expect(patientRequest.next("accepted", "mark_ready")).toBe("ready");
    expect(patientRequest.next("ready", "collect")).toBe("completed");
    for (const s of ["sent", "accepted", "ready"]) expect(patientRequest.canMoveTo(s, "rejected")).toBe(true);
    expect(patientRequest.canMoveTo("completed", "rejected")).toBe(false);
  });
  it("keeps the exact open list the app already used", () => {
    expect(OPEN_REQUEST).toEqual(["sent", "accepted", "ready"]);
  });
  it("documents that the database does NOT yet guard this lifecycle", () => {
    const fn = m0001.slice(m0001.indexOf("function public.act_on_patient_request"), m0001.indexOf("revoke execute"));
    expect(list(fn.match(/_status not in \(([^)]*)\)/)![1]!).sort()).toEqual(["accepted", "completed", "ready", "rejected"]);
    // If someone adds a `r.status` guard, flip `guard` to "database" in state-machines.ts and update this test.
    expect(fn).not.toMatch(/r\.status\s*(=|<>|in|not in)/);
    expect(patientRequest.guard).toBe("ui");
  });
});

describe("mobile clinic request", () => {
  it("matches update_mobile_request in the database", () => {
    const guard = m0003.match(/IF NOT \(\((r\.status=.*?)\)\) THEN RAISE EXCEPTION 'Invalid request status change'/s)![1]!;
    const found = new Set<string>();
    for (const g of guard.split(/\) OR \(/)) {
      const from = g.match(/r\.status='([^']+)'/)![1]!;
      for (const to of list(g.match(/IN \(([^)]*)\)/)![1]!)) found.add(`${from}>${to}`);
    }
    expect(found).toEqual(new Set(mobileRequest.transitions.map(pair)));
  });
  it("status lists match the CHECK constraints", () => {
    const check = m0003.match(/mobile_requests[^;]*?status text NOT NULL DEFAULT 'Submitted' CHECK\(status IN \(([^)]*)\)/s)![1]!;
    expect(list(check).sort()).toEqual([...mobileRequest.stateList].sort());
    const clinic = m0003.match(/mobile_clinics[^;]*?status text NOT NULL DEFAULT 'Loading' CHECK\(status IN \(([^)]*)\)/s)![1]!;
    expect(list(clinic)).toEqual([...mobileClinic.stateList]);
  });
  it("forward buttons are unchanged", () => {
    expect(MOBILE_REQUEST_NEXT).toEqual({ Submitted: "Preparing", Preparing: "Ready on vehicle", "Ready on vehicle": "Collected" });
    expect(requestNext).toEqual(MOBILE_REQUEST_NEXT);
  });
});

describe("mobile clinic journey", () => {
  it("offers every status button, as the UI does today", () => {
    expect(CLINIC_STATUSES).toEqual(["Loading", "En route", "Arrived", "Completed"]);
    expect(mobileClinic.guard).toBe("none");
  });
});

describe("notification", () => {
  it("matches notification_action in the database", () => {
    expect(m0002).toContain("status = 'read' where id = _id and status = 'unread'");
    expect(m0002).toContain("n.status not in ('unread','read')");
    expect(notification.canMoveTo("unread", "read")).toBe(true);
    expect(notification.canMoveTo("read", "accepted")).toBe(true);
    expect(notification.canMoveTo("dismissed", "accepted")).toBe(false);
  });
});

describe("device action", () => {
  it("names the state hidden in synced/error", () => {
    expect(deviceActionState({})).toBe("pending");
    expect(deviceActionState({ error: "Stock changed" })).toBe("paused");
    expect(deviceActionState({ synced: true })).toBe("synced");
    expect(deviceActionState({ synced: true, error: "stale" })).toBe("synced");
  });
});

describe("connectivity", () => {
  it("is online only when the browser is online and manual offline is off", () => {
    expect(connectivityMode(true, false)).toBe("online");
    expect(connectivityMode(false, false)).toBe("offline");
    expect(connectivityMode(true, true)).toBe("manual-offline");
    expect(connectivityMode(false, true)).toBe("manual-offline");
  });
});
