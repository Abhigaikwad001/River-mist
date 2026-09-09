import {
  normalizeToIstDateRange,
  formatToIstDateString,
  isDateInIstRange,
  IST_OFFSET_MS,
  ONE_DAY_MS,
} from './date.util';
import { BadRequestException } from '@nestjs/common';

describe('Authoritative IST Date Utility (Phase 18A)', () => {
  describe('A. IST Midnight (Date-only string)', () => {
    it('normalizes 2026-09-09 to exact UTC boundaries [2026-09-08T18:30:00.000Z, 2026-09-09T18:30:00.000Z)', () => {
      const range = normalizeToIstDateRange('2026-09-09');

      expect(range.dateStr).toBe('2026-09-09');
      expect(range.startOfDay.toISOString()).toBe('2026-09-08T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(range.endOfDay.getTime() - range.startOfDay.getTime()).toBe(ONE_DAY_MS);
    });
  });

  describe('B. 00:01 IST (1 minute past midnight IST)', () => {
    it('correctly attributes 2026-09-08T18:31:00.000Z to September 9 IST', () => {
      const timestamp = new Date('2026-09-08T18:31:00.000Z');
      const range = normalizeToIstDateRange(timestamp);

      expect(range.dateStr).toBe('2026-09-09');
      expect(range.startOfDay.toISOString()).toBe('2026-09-08T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(isDateInIstRange(timestamp, range.startOfDay, range.endOfDay)).toBe(true);
    });
  });

  describe('C. 23:59:59.999 IST (last millisecond of the day)', () => {
    it('correctly attributes 2026-09-09T18:29:59.999Z to September 9 IST', () => {
      const timestamp = new Date('2026-09-09T18:29:59.999Z');
      const range = normalizeToIstDateRange(timestamp);

      expect(range.dateStr).toBe('2026-09-09');
      expect(range.startOfDay.toISOString()).toBe('2026-09-08T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(isDateInIstRange(timestamp, range.startOfDay, range.endOfDay)).toBe(true);
    });
  });

  describe('D. Next-day Boundary (00:00:00.000 IST of next day)', () => {
    it('excludes 2026-09-09T18:30:00.000Z from September 9 and attributes to September 10 IST', () => {
      const nextDayMidnight = new Date('2026-09-09T18:30:00.000Z');

      // Check against Sep 9 boundaries
      const sep9Range = normalizeToIstDateRange('2026-09-09');
      expect(isDateInIstRange(nextDayMidnight, sep9Range.startOfDay, sep9Range.endOfDay)).toBe(false);

      // Check its own range
      const range = normalizeToIstDateRange(nextDayMidnight);
      expect(range.dateStr).toBe('2026-09-10');
      expect(range.startOfDay.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-10T18:30:00.000Z');
      expect(isDateInIstRange(nextDayMidnight, range.startOfDay, range.endOfDay)).toBe(true);
    });
  });

  describe('E. UTC/IST Date Crossing', () => {
    it('handles 2026-09-08T20:00:00.000Z (UTC Sep 8, but IST Sep 9 01:30:00)', () => {
      const timestamp = new Date('2026-09-08T20:00:00.000Z');
      const range = normalizeToIstDateRange(timestamp);

      expect(range.dateStr).toBe('2026-09-09');
      expect(range.startOfDay.toISOString()).toBe('2026-09-08T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(isDateInIstRange(timestamp, range.startOfDay, range.endOfDay)).toBe(true);
    });
  });

  describe('F. Month Boundaries', () => {
    it('normalizes the first day of a month (2026-09-01)', () => {
      const range = normalizeToIstDateRange('2026-09-01');
      expect(range.dateStr).toBe('2026-09-01');
      expect(range.startOfDay.toISOString()).toBe('2026-08-31T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-01T18:30:00.000Z');
    });

    it('normalizes the last day of a month (2026-09-30)', () => {
      const range = normalizeToIstDateRange('2026-09-30');
      expect(range.dateStr).toBe('2026-09-30');
      expect(range.startOfDay.toISOString()).toBe('2026-09-29T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    });

    it('normalizes leap year February 29 (2024-02-29)', () => {
      const range = normalizeToIstDateRange('2024-02-29');
      expect(range.dateStr).toBe('2024-02-29');
      expect(range.startOfDay.toISOString()).toBe('2024-02-28T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2024-02-29T18:30:00.000Z');
    });

    it('normalizes non-leap year February 28 (2026-02-28)', () => {
      const range = normalizeToIstDateRange('2026-02-28');
      expect(range.dateStr).toBe('2026-02-28');
      expect(range.startOfDay.toISOString()).toBe('2026-02-27T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-02-28T18:30:00.000Z');
    });
  });

  describe('G. Year Boundaries', () => {
    it('normalizes New Year’s Eve (2026-12-31)', () => {
      const range = normalizeToIstDateRange('2026-12-31');
      expect(range.dateStr).toBe('2026-12-31');
      expect(range.startOfDay.toISOString()).toBe('2026-12-30T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2026-12-31T18:30:00.000Z');
    });

    it('normalizes New Year’s Day (2027-01-01)', () => {
      const range = normalizeToIstDateRange('2027-01-01');
      expect(range.dateStr).toBe('2027-01-01');
      expect(range.startOfDay.toISOString()).toBe('2026-12-31T18:30:00.000Z');
      expect(range.endOfDay.toISOString()).toBe('2027-01-01T18:30:00.000Z');
    });
  });

  describe('H & I. Capacity Query Boundaries (Half-open intervals [start, end))', () => {
    const range = normalizeToIstDateRange('2026-09-09');

    it('excludes a booking 1ms before IST midnight (2026-09-08T18:29:59.999Z)', () => {
      const priorBooking = new Date('2026-09-08T18:29:59.999Z');
      expect(isDateInIstRange(priorBooking, range.startOfDay, range.endOfDay)).toBe(false);
      expect(priorBooking.getTime() < range.startOfDay.getTime()).toBe(true);
    });

    it('includes a booking exactly at IST midnight (2026-09-08T18:30:00.000Z)', () => {
      const midnightBooking = new Date('2026-09-08T18:30:00.000Z');
      expect(isDateInIstRange(midnightBooking, range.startOfDay, range.endOfDay)).toBe(true);
      expect(midnightBooking.getTime() === range.startOfDay.getTime()).toBe(true);
    });

    it('includes a booking at midday IST (2026-09-09T06:30:00.000Z = 12:00:00 IST)', () => {
      const middayBooking = new Date('2026-09-09T06:30:00.000Z');
      expect(isDateInIstRange(middayBooking, range.startOfDay, range.endOfDay)).toBe(true);
    });

    it('excludes a booking exactly at next IST midnight (2026-09-09T18:30:00.000Z) via strict upper-bound exclusion (< endOfDay)', () => {
      const nextMidnightBooking = new Date('2026-09-09T18:30:00.000Z');
      expect(isDateInIstRange(nextMidnightBooking, range.startOfDay, range.endOfDay)).toBe(false);
      expect(nextMidnightBooking.getTime() >= range.endOfDay.getTime()).toBe(true);
    });
  });

  describe('Server Timezone Independence', () => {
    it('produces identical UTC timestamps regardless of process timezone', () => {
      const testInputs = [
        '2026-09-09',
        '2026-09-08T18:30:00.000Z',
        '2026-09-09T00:00:00.000Z',
        '2026-12-31',
        '2027-01-01',
      ];

      for (const input of testInputs) {
        const result = normalizeToIstDateRange(input);
        expect(result.startOfDay.getUTCHours()).toBe(18);
        expect(result.startOfDay.getUTCMinutes()).toBe(30);
        expect(result.startOfDay.getUTCSeconds()).toBe(0);
        expect(result.startOfDay.getUTCMilliseconds()).toBe(0);

        expect(result.endOfDay.getUTCHours()).toBe(18);
        expect(result.endOfDay.getUTCMinutes()).toBe(30);
        expect(result.endOfDay.getUTCSeconds()).toBe(0);
        expect(result.endOfDay.getUTCMilliseconds()).toBe(0);

        expect(result.endOfDay.getTime() - result.startOfDay.getTime()).toBe(24 * 3600 * 1000);
      }
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws BadRequestException on empty/null input', () => {
      expect(() => normalizeToIstDateRange('' as any)).toThrow(BadRequestException);
      expect(() => normalizeToIstDateRange(null as any)).toThrow(BadRequestException);
      expect(() => normalizeToIstDateRange(undefined as any)).toThrow(BadRequestException);
    });

    it('throws BadRequestException on impossible calendar date (e.g. 2026-02-30)', () => {
      expect(() => normalizeToIstDateRange('2026-02-30')).toThrow(BadRequestException);
      expect(() => normalizeToIstDateRange('2026-04-31')).toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid timestamp strings', () => {
      expect(() => normalizeToIstDateRange('invalid-date')).toThrow(BadRequestException);
      expect(() => normalizeToIstDateRange('2026-99-99')).toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid Date instance', () => {
      expect(() => normalizeToIstDateRange(new Date('invalid'))).toThrow(BadRequestException);
    });
  });

  describe('formatToIstDateString', () => {
    it('formats UTC timestamps to correct IST YYYY-MM-DD', () => {
      expect(formatToIstDateString('2026-09-08T18:30:00.000Z')).toBe('2026-09-09');
      expect(formatToIstDateString('2026-09-08T18:29:59.999Z')).toBe('2026-09-08');
      expect(formatToIstDateString('2026-09-09T00:00:00.000Z')).toBe('2026-09-09');
      expect(formatToIstDateString(new Date('2026-12-31T18:30:00.000Z'))).toBe('2027-01-01');
    });
  });
});
