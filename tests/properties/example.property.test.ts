import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Property-Based Test Example', () => {
  it('should verify string concatenation is associative', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        const left = (a + b) + c;
        const right = a + (b + c);
        expect(left).toBe(right);
      }),
      { numRuns: 100 }
    );
  });

  it('should verify array length after push', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (arr, item) => {
        const originalLength = arr.length;
        arr.push(item);
        expect(arr.length).toBe(originalLength + 1);
      }),
      { numRuns: 100 }
    );
  });
});
