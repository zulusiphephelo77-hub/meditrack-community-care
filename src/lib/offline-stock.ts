import { z } from 'zod';
export const OFFLINE_TRIGGER = 200;
export const actionSchema = z.object({ id: z.string().uuid(), kind: z.enum(['order','count','dispense']), facility: z.string().uuid(), medicine: z.string().uuid(), batch: z.string().uuid().optional(), quantity: z.number().int().nonnegative(), expected: z.number().int().nonnegative().optional(), requiredBy: z.string().optional(), reason: z.string().optional(), createdAt: z.string(), synced: z.boolean().optional(), error: z.string().optional() });
export type DeviceAction = z.infer<typeof actionSchema>;
export type DeviceStock = { batch: string; medicine: string; name: string; quantity: number; capacity: number; dailyUse: number; expiry: string };
export type DeviceStore = { facility: string; name: string; stocks: DeviceStock[]; actions: DeviceAction[] };
export function dispenseToTrigger(quantity: number) { return Math.max(0, quantity - OFFLINE_TRIGGER); }
export function needsDeviceOrder(quantity: number, actions: DeviceAction[], medicine: string, hasOpenOrder = false) { return !hasOpenOrder && quantity <= OFFLINE_TRIGGER && !actions.some(a => a.kind === 'order' && a.medicine === medicine && !a.synced); }
export function parsePacket(input: unknown, facility: string) { const packet = z.object({ version: z.literal(1), facility: z.string().uuid(), actions: z.array(actionSchema).max(1000) }).parse(input); if(packet.facility !== facility || packet.actions.some(a=>a.facility!==facility)) throw new Error('This packet belongs to another facility'); return packet.actions; }
