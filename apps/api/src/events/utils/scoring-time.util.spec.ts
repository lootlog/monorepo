import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
} from './scoring-time.util';

describe('scoring-time.util', () => {
  const timeZone = 'Europe/Warsaw';

  describe('isLocalTimeInRange', () => {
    it('returns true when local time is inside range', () => {
      const result = isLocalTimeInRange({
        date: new Date('2026-01-15T07:30:00.000Z'),
        timeZone,
        from: '08:00',
        to: '11:00',
      });

      expect(result).toBe(true);
    });

    it('returns false for range end boundary (exclusive)', () => {
      const result = isLocalTimeInRange({
        date: new Date('2026-01-15T10:00:00.000Z'),
        timeZone,
        from: '08:00',
        to: '11:00',
      });

      expect(result).toBe(false);
    });
  });

  describe('calculateLocalWindowOverlapMs', () => {
    it('calculates overlap for a standard day window', () => {
      const overlap = calculateLocalWindowOverlapMs({
        startUtc: new Date('2026-01-15T02:00:00.000Z'),
        endUtc: new Date('2026-01-15T06:00:00.000Z'),
        timeZone,
        windowFrom: '03:00',
        windowTo: '08:00',
      });

      expect(overlap).toBe(4 * 60 * 60 * 1000);
    });

    it('handles DST forward transition without breaking overlap math', () => {
      const overlap = calculateLocalWindowOverlapMs({
        startUtc: new Date('2026-03-29T00:00:00.000Z'),
        endUtc: new Date('2026-03-29T06:00:00.000Z'),
        timeZone,
        windowFrom: '03:00',
        windowTo: '08:00',
      });

      expect(overlap).toBe(5 * 60 * 60 * 1000);
    });
  });
});
