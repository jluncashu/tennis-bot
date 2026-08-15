export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toDateId(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Parsed as local calendar fields (not UTC) so it never shifts a day
// depending on the browser's timezone.
export function fromDateId(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, amount: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount);
}

// Romanian clubs run Monday-Sunday weeks, so getDay() (0=Sun..6=Sat) needs
// remapping — Monday is the anchor, not the locale-independent getDay() zero.
export function startOfWeek(d: Date): Date {
  const start = startOfDay(d);
  const offsetFromMonday = (start.getDay() + 6) % 7;
  return addDays(start, -offsetFromMonday);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, amount: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + amount, 1);
}
