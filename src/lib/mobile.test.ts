import {expect,it} from 'vitest';import {shortfall,requestNext} from './mobile';
it('load list flags exactly missing pills',()=>{expect(shortfall(90,50)).toBe(40);expect(shortfall(30,50)).toBe(0)});
it('requests follow collection stages',()=>{expect(requestNext['Submitted']).toBe('Preparing');expect(requestNext['Preparing']).toBe('Ready on vehicle');expect(requestNext['Ready on vehicle']).toBe('Collected')});
