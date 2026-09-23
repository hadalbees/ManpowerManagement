/**
 * Timezone & Business Date Utilities
 * Anchored to the agency application's configured timezone (Asia/Kolkata / IST UTC+05:30).
 * Prevents host/server local timezone drift across shifts, anchor dates, and rosters.
 */

export const DEFAULT_APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD date string in the target timezone for a given timestamp.
 */
export function getBusinessDateInTimezone(
  dateInput: Date | string = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE,
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns ISO Day of Week (1 = Monday, ..., 7 = Sunday) in the target timezone.
 */
export function getDayOfWeekInTimezone(
  dateStr: string,
  timeZone: string = DEFAULT_APP_TIMEZONE,
): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Construct a noon UTC date to avoid any DST/edge artifacts
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d);
  const dayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return dayMap[dayName] || 1;
}

/**
 * Computes exact worked hours and overtime hours given clock-in and clock-out timestamps.
 * If clock-out crosses midnight, the duration naturally accounts for the positive elapsed time.
 */
export function calculateHoursFromClockTimes(
  clockInTime?: Date | string | null,
  clockOutTime?: Date | string | null,
  scheduledHours = 8.0,
  breakMinutes = 0,
): { workedHours: number; overtimeHours: number } {
  if (!clockInTime || !clockOutTime) {
    return {
      workedHours: scheduledHours,
      overtimeHours: 0,
    };
  }

  const start = new Date(clockInTime).getTime();
  const end = new Date(clockOutTime).getTime();

  if (end <= start) {
    return {
      workedHours: 0,
      overtimeHours: 0,
    };
  }

  const diffMs = end - start;
  const rawHours = diffMs / (1000 * 60 * 60);
  const breakHours = (breakMinutes || 0) / 60;
  const netHours = Math.max(0, rawHours - breakHours);
  const workedHours = Math.round(netHours * 100) / 100;
  const overtimeHours = workedHours > scheduledHours
    ? Math.round((workedHours - scheduledHours) * 100) / 100
    : 0;

  return { workedHours, overtimeHours };
}

/**
 * Determines the integer leave year for a given date in target timezone.
 * Defaults to startMonth = 4 (April, for Indian Financial Year April 1 - March 31).
 * Example: '2026-05-15' with startMonth=4 -> 2026
 * Example: '2027-02-10' with startMonth=4 -> 2026 (part of 2026-27)
 * Example: '2027-04-01' with startMonth=4 -> 2027
 */
export function getLeaveYearForDate(
  dateInput: Date | string,
  startMonth = Number(process.env.LEAVE_YEAR_START_MONTH) || 4,
  timeZone: string = DEFAULT_APP_TIMEZONE,
): number {
  const dateStr = getBusinessDateInTimezone(dateInput, timeZone);
  const [year, month] = dateStr.split('-').map(Number);
  if (month >= startMonth) {
    return year;
  }
  return year - 1;
}

/**
 * Returns an array of YYYY-MM-DD date strings between start and end date inclusive.
 */
export function getDateRangeArray(
  startDateStr: string,
  endDateStr: string,
): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  let current = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

