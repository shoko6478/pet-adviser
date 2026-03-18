export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}
