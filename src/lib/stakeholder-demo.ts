export type StaffTask = { id: string; title: string; time: string; done: boolean };
export type Dispense = { id: string; patient: string; medicine: string; quantity: number; done: boolean };
export type Medicine = { name: string; quantity: number; reorderAt: number };
export type Transfer = { id: string; facility: string; medicine: string; quantity: number; status: "Pending" | "Approved" | "Declined" };
export type WarehouseOrder = { id: string; facility: string; lines: number; status: "Queued" | "Packed" | "Dispatched" };
export type SupplierOrder = { id: string; item: string; quantity: number; status: "Awaiting confirmation" | "Confirmed" | "Ready to ship" };
export type Delivery = { id: string; route: string; status: "Planned" | "En route" | "Delivered"; temperature: string };
export type Alert = { id: string; title: string; acknowledged: boolean };

export type DemoWorkspace = {
  version: 1;
  tasks: StaffTask[];
  dispenseQueue: Dispense[];
  medicines: Medicine[];
  transfers: Transfer[];
  warehouseOrders: WarehouseOrder[];
  supplierOrders: SupplierOrder[];
  deliveries: Delivery[];
  alerts: Alert[];
  bulletins: string[];
};

export const DEMO_WORKSPACE_KEY = "medicare-stakeholder-workspace-v1";

export function createDemoWorkspace(): DemoWorkspace {
  return {
    version: 1,
    tasks: [
      { id: "task-1", title: "Chronic care follow-up", time: "09:00", done: false },
      { id: "task-2", title: "Medicine collection", time: "10:30", done: false },
      { id: "task-3", title: "Referral review", time: "12:00", done: false },
    ],
    dispenseQueue: [
      { id: "rx-1", patient: "Demo patient A", medicine: "Amlodipine 10mg", quantity: 30, done: false },
      { id: "rx-2", patient: "Demo patient B", medicine: "Insulin (Actraphane)", quantity: 2, done: false },
      { id: "rx-3", patient: "Demo patient C", medicine: "Salbutamol inhaler", quantity: 1, done: false },
    ],
    medicines: [
      { name: "Amlodipine 10mg", quantity: 120, reorderAt: 30 },
      { name: "Insulin (Actraphane)", quantity: 18, reorderAt: 20 },
      { name: "Salbutamol inhaler", quantity: 8, reorderAt: 10 },
      { name: "Amoxicillin 500mg", quantity: 65, reorderAt: 25 },
    ],
    transfers: [
      { id: "TR-DEMO-01", facility: "Ndwedwe Rural Clinic", medicine: "Insulin", quantity: 12, status: "Pending" },
      { id: "TR-DEMO-02", facility: "KwaDabeka CHC", medicine: "Amlodipine 10mg", quantity: 30, status: "Pending" },
      { id: "TR-DEMO-03", facility: "Ixopo Rural Clinic", medicine: "Amoxicillin 500mg", quantity: 20, status: "Approved" },
    ],
    warehouseOrders: [
      { id: "WH-DEMO-101", facility: "Edendale Hospital", lines: 4, status: "Queued" },
      { id: "WH-DEMO-102", facility: "Ndwedwe Rural Clinic", lines: 3, status: "Packed" },
      { id: "WH-DEMO-103", facility: "KwaDabeka CHC", lines: 2, status: "Dispatched" },
    ],
    supplierOrders: [
      { id: "PO-DEMO-201", item: "Amlodipine 10mg", quantity: 500, status: "Awaiting confirmation" },
      { id: "PO-DEMO-202", item: "Insulin (Actraphane)", quantity: 80, status: "Confirmed" },
      { id: "PO-DEMO-203", item: "Salbutamol inhaler", quantity: 40, status: "Ready to ship" },
    ],
    deliveries: [
      { id: "DL-DEMO-301", route: "Pietermaritzburg → Edendale", status: "Planned", temperature: "Not recorded" },
      { id: "DL-DEMO-302", route: "Warehouse → Ndwedwe", status: "En route", temperature: "Not recorded" },
      { id: "DL-DEMO-303", route: "Warehouse → Ixopo", status: "Delivered", temperature: "4°C · simulated" },
    ],
    alerts: [
      { id: "AL-DEMO-401", title: "Low-stock notice at Ndwedwe Rural Clinic", acknowledged: false },
      { id: "AL-DEMO-402", title: "Near-expiry batch review at Edendale Hospital", acknowledged: false },
      { id: "AL-DEMO-403", title: "Delivery performance report is ready", acknowledged: false },
    ],
    bulletins: [],
  };
}

export function loadDemoWorkspace(): DemoWorkspace {
  if (typeof window === "undefined") return createDemoWorkspace();
  try {
    const raw = window.localStorage.getItem(DEMO_WORKSPACE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<DemoWorkspace>;
      if (value.version === 1 && ["tasks", "dispenseQueue", "medicines", "transfers", "warehouseOrders", "supplierOrders", "deliveries", "alerts", "bulletins"].every((key) => Array.isArray(value[key as keyof DemoWorkspace]))) {
        return value as DemoWorkspace;
      }
    }
  } catch {
    // Invalid local demo data is replaced with the fictional defaults.
  }
  return createDemoWorkspace();
}

export function saveDemoWorkspace(workspace: DemoWorkspace) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(workspace));
  } catch {
    // The demo remains usable for this visit when browser storage is unavailable.
  }
}

export function resetDemoWorkspace() {
  const workspace = createDemoWorkspace();
  saveDemoWorkspace(workspace);
  return workspace;
}
