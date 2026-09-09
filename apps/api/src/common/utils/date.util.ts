import { BadRequestException } from '@nestjs/common';

/**
 * Indian Standard Time (IST) is UTC+05:30.
 * India does not observe Daylight Saving Time (DST); the offset is permanently fixed.
 */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 19,800,000 ms (5.5 hours)
export const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms (24 hours)

export interface IstDateRange {
  /** 00:00:00.000 IST represented as a UTC Date */
  startOfDay: Date;
  /** Next 00:00:00.000 IST represented as a UTC Date (exclusive upper bound) */
  endOfDay: Date;
  /** Formatted YYYY-MM-DD string representing the IST business day */
  dateStr: string;
}

/**
 * Normalizes any business date or timestamp to an authoritative, deterministic
 * half-open interval [startOfDay, endOfDay) in Indian Standard Time (IST, Asia/Kolkata).
 *
 * Behavior:
 * 1. Date-only string (e.g. "2026-09-09"):
 *    Treated explicitly as the business calendar day 2026-09-09 in IST.
 *    startOfDay = 2026-09-09 00:00:00.000 IST => 2026-09-08T18:30:00.000Z
 *    endOfDay   = 2026-09-10 00:00:00.000 IST => 2026-09-09T18:30:00.000Z
 *
 * 2. Date object or ISO timestamp string (e.g. "2026-09-08T18:31:00.000Z"):
 *    Determines which IST calendar day this absolute point in time falls into.
 *    Preserves absolute UTC time, computes the IST calendar date, and returns
 *    the [startOfDay, endOfDay) boundaries for that IST calendar date.
 *
 * Query semantics:
 * Use: { gte: range.startOfDay, lt: range.endOfDay }
 * Never use: { lte: 23:59:59 }
 *
 * This function relies exclusively on UTC arithmetic and is 100% independent of
 * the server's local operating system timezone (e.g., UTC, America/Los_Angeles, etc.).
 */
export function normalizeToIstDateRange(dateInput: Date | string): IstDateRange {
  if (!dateInput) {
    throw new BadRequestException('Date input is required');
  }

  let year: number;
  let month: number; // 0-indexed (0 = Jan, 11 = Dec)
  let day: number;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();

    // Check if input is a date-only string in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);

      // Validate valid calendar date (e.g., reject 2026-02-30)
      const checkUtc = new Date(Date.UTC(year, month, day));
      if (
        checkUtc.getUTCFullYear() !== year ||
        checkUtc.getUTCMonth() !== month ||
        checkUtc.getUTCDate() !== day
      ) {
        throw new BadRequestException(`Invalid calendar date: ${dateInput}`);
      }

      const startMs = Date.UTC(year, month, day) - IST_OFFSET_MS;
      const startOfDay = new Date(startMs);
      const endOfDay = new Date(startMs + ONE_DAY_MS);
      const dateStr = trimmed;

      return { startOfDay, endOfDay, dateStr };
    }

    // Otherwise parse full timestamp string
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date string: ${dateInput}`);
    }
    return normalizeTimestampToIst(parsed.getTime());
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new BadRequestException('Invalid Date instance provided');
    }
    return normalizeTimestampToIst(dateInput.getTime());
  }

  throw new BadRequestException('Unsupported date input format');
}

/**
 * Maps an absolute epoch millisecond timestamp to its corresponding IST calendar day range.
 */
function normalizeTimestampToIst(epochMs: number): IstDateRange {
  // Shifting the UTC epoch by +IST_OFFSET_MS allows UTC getters to yield the exact IST calendar date
  const istEpoch = epochMs + IST_OFFSET_MS;
  const istDateObj = new Date(istEpoch);

  const year = istDateObj.getUTCFullYear();
  const month = istDateObj.getUTCMonth();
  const day = istDateObj.getUTCDate();

  const startMs = Date.UTC(year, month, day) - IST_OFFSET_MS;
  const startOfDay = new Date(startMs);
  const endOfDay = new Date(startMs + ONE_DAY_MS);

  const yStr = String(year).padStart(4, '0');
  const mStr = String(month + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  const dateStr = `${yStr}-${mStr}-${dStr}`;

  return { startOfDay, endOfDay, dateStr };
}

/**
 * Formats a Date or timestamp to a YYYY-MM-DD string in Asia/Kolkata (IST).
 */
export function formatToIstDateString(dateInput: Date | string): string {
  const { dateStr } = normalizeToIstDateRange(dateInput);
  return dateStr;
}

/**
 * Checks whether a given timestamp falls within an IST date range [startOfDay, endOfDay).
 */
export function isDateInIstRange(
  target: Date | string,
  startOfDay: Date,
  endOfDay: Date
): boolean {
  const targetDate = target instanceof Date ? target : new Date(target);
  if (isNaN(targetDate.getTime())) {
    return false;
  }
  return targetDate >= startOfDay && targetDate < endOfDay;
}
