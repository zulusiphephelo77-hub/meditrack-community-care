import { describe,it,expect } from 'vitest';
import { dispenseToTrigger,needsDeviceOrder,parsePacket } from './offline-stock';
describe('device stock rules',()=>{
 it('simulation stops at 200 pills',()=>expect(650-dispenseToTrigger(650)).toBe(200));
 it('does not invent pills below 200',()=>expect(dispenseToTrigger(100)).toBe(0));
 it('orders at 200, not 201',()=>{ expect(needsDeviceOrder(200,[],'m')).toBe(true);expect(needsDeviceOrder(201,[],'m')).toBe(false); });
 it('rejects another facility packet',()=>expect(()=>parsePacket({version:1,facility:'11111111-1111-4111-8111-111111111111',actions:[]},'22222222-2222-4222-8222-222222222222')).toThrow());
});
