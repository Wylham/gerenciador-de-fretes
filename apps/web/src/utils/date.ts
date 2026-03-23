import { APP_TIMEZONE } from "../constants";

function formatToParts(
  value: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    ...options,
  });

  return formatter.formatToParts(value).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

export function getTodayInSaoPaulo(): string {
  const parts = formatToParts(new Date(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
