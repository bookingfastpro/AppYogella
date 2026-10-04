/**
 * Dates « du studio » : les cours sont planifiés à l'heure de Paris, quel que
 * soit le fuseau du serveur (UTC en production). Les jours sont manipulés en
 * chaînes « YYYY-MM-DD » pour éviter tout décalage d'un jour.
 */
export const STUDIO_TZ = "Europe/Paris";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDay = (s: string) => DAY_RE.test(s);
export const isTime = (s: string) => TIME_RE.test(s);

/** Décalage (minutes) du fuseau par rapport à UTC à cet instant. */
function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** « 2026-10-05 » + « 18:30 » à Paris → instant UTC. Gère les changements d'heure. */
export function zonedToUtc(day: string, time: string, tz = STUDIO_TZ): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = tzOffsetMinutes(new Date(guess), tz);
  let utc = guess - first * 60000;
  const second = tzOffsetMinutes(new Date(utc), tz);
  if (second !== first) utc = guess - second * 60000;
  return new Date(utc);
}

/** Jour local (Paris) d'un instant, « YYYY-MM-DD ». */
export function localDay(at: Date, tz = STUDIO_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Heure locale (Paris) d'un instant, « HH:MM ». */
export function localTime(at: Date, tz = STUDIO_TZ): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Bornes UTC [début, fin[ d'une journée à Paris. */
export function dayBounds(day: string): { start: Date; end: Date } {
  return { start: zonedToUtc(day, "00:00"), end: zonedToUtc(addDays(day, 1), "00:00") };
}

export const today = () => localDay(new Date());

/** Colonne Postgres « date » (minuit UTC) → « YYYY-MM-DD », et l'inverse. */
export const dbDayToString = (d: Date) => d.toISOString().slice(0, 10);
export const stringToDbDay = (s: string) => new Date(`${s}T00:00:00.000Z`);
