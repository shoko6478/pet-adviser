const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getTodayDateString(): string {
  return formatDateForInput(new Date());
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateStringAsUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function addDays(date: string, days: number): string {
  const parsed = parseDateStringAsUtc(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function diffDays(fromDate: string, toDate: string): number {
  const from = parseDateStringAsUtc(fromDate).getTime();
  const to = parseDateStringAsUtc(toDate).getTime();
  return Math.round((to - from) / DAY_IN_MS);
}

export function formatShortDateLabel(date: string): string {
  const parsed = parseDateStringAsUtc(date);
  return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`;
}

export function getDayOfWeek(date: string): number {
  return parseDateStringAsUtc(date).getUTCDay();
}

export function getMonthDifference(fromMonth: string, toDate: string): number {
  const [fromYear, fromMonthNumber] = fromMonth.split("-").map(Number);
  const [toYear, toMonth] = toDate.split("-").map(Number);

  if (!fromYear || !fromMonthNumber || !toYear || !toMonth) {
    return 0;
  }

  return Math.max(0, (toYear - fromYear) * 12 + (toMonth - fromMonthNumber));
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}
