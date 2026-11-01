export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function withDay(base: Date, day: Date): Date {
  const x = new Date(base);
  x.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return x;
}

export function withTime(base: Date, hour: number, minute = 0): Date {
  const x = new Date(base);
  x.setHours(hour, minute, 0, 0);
  return x;
}

export function nextDays(count: number): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

export function dayLabel(day: Date, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

export const TIME_OPTIONS: { hour: number; label: string }[] = [
  { hour: 8, label: "8:00 AM" },
  { hour: 12, label: "12:00 PM" },
  { hour: 15, label: "3:00 PM" },
  { hour: 18, label: "6:00 PM" },
  { hour: 21, label: "9:00 PM" },
];

export function formatSummary(d: Date): string {
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Tomorrow at 6 PM is a sensible default deadline.
export function defaultDue(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromInputValue(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}