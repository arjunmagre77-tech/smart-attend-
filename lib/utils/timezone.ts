// lib/utils/timezone.ts
// School-timezone aware date utilities

import { format, toZonedTime, fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

/**
 * Returns the current school-timezone date key "YYYY-MM-DD"
 */
export function getTodayDateKey(timezone: string = "Asia/Kolkata"): string {
  const now = new Date();
  return formatInTz(now, timezone, "yyyy-MM-dd");
}

/**
 * Converts a UTC Date to a school-timezone-aware date key "YYYY-MM-DD"
 */
export function toDateKey(date: Date, timezone: string = "Asia/Kolkata"): string {
  return formatInTz(date, timezone, "yyyy-MM-dd");
}

/**
 * Formats a date in the given timezone using the given format string
 */
export function formatInTz(
  date: Date,
  timezone: string,
  formatStr: string
): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, formatStr, { timeZone: timezone });
}

/**
 * Parses a "HH:mm" time string and returns a Date in the given timezone
 */
export function parseCutoffTime(
  dateKey: string,
  timeStr: string,
  timezone: string
): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const localDateStr = `${dateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  return fromZonedTime(localDateStr, timezone);
}

/**
 * Determines attendance status based on check-in time and school cutoffs
 */
export function determineStatus(
  checkInAt: Date,
  dateKey: string,
  timezone: string,
  cutoffTime: string,
  absentCutoff: string
): "present" | "late" | "absent" {
  const cutoff = parseCutoffTime(dateKey, cutoffTime, timezone);
  const absentCutoffDate = parseCutoffTime(dateKey, absentCutoff, timezone);

  if (checkInAt > absentCutoffDate) return "absent";
  if (checkInAt > cutoff) return "late";
  return "present";
}

/**
 * Formats a date for display in the school timezone
 */
export function formatDisplayTime(
  isoString: string,
  timezone: string = "Asia/Kolkata"
): string {
  const date = parseISO(isoString);
  return formatInTz(date, timezone, "hh:mm a");
}

/**
 * Formats a date key to a readable label
 */
export function formatDateKey(dateKey: string): string {
  const date = parseISO(dateKey);
  return format(date, "EEEE, MMMM d, yyyy");
}
