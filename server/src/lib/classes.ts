import type { ClassSeries, ClassSession } from "@prisma/client";
import { prisma } from "./prisma.js";
import { addDays, dbDayToString, localDay, localTime, stringToDbDay, today, weekdayOf, zonedToUtc } from "./time.js";

/** Les séances récurrentes sont générées environ 4 mois à l'avance. */
export const HORIZON_DAYS = 120;

/**
 * Crée les séances manquantes d'une série jusqu'au jour `until` (inclus),
 * sans dépasser sa date de fin. Idempotent : l'index unique
 * (series_id, starts_at) écarte les doublons.
 */
export async function generateSeries(series: ClassSeries, until: string) {
  if (!series.active) return;
  const end = series.endDate ? dbDayToString(series.endDate) : null;
  const last = end && end < until ? end : until;
  const from = series.generatedUntil ? addDays(dbDayToString(series.generatedUntil), 1) : dbDayToString(series.startDate);
  if (from > last) return;

  const rows: { seriesId: string; title: string; description: string | null; instructor: string | null; location: string | null; level: string | null; startsAt: Date; durationMin: number; capacity: number }[] = [];
  for (let day = from; day <= last; day = addDays(day, 1)) {
    if (!series.weekdays.includes(weekdayOf(day))) continue;
    rows.push({
      seriesId: series.id,
      title: series.title,
      description: series.description,
      instructor: series.instructor,
      location: series.location,
      level: series.level,
      startsAt: zonedToUtc(day, series.startTime),
      durationMin: series.durationMin,
      capacity: series.capacity,
    });
  }
  if (rows.length) await prisma.classSession.createMany({ data: rows, skipDuplicates: true });
  await prisma.classSeries.update({ where: { id: series.id }, data: { generatedUntil: stringToDbDay(last) } });
}

/** Garantit que toutes les séries actives sont générées jusqu'à `until`. */
export async function ensureGenerated(until: string) {
  const cap = addDays(today(), 365);
  const target = until > cap ? cap : until;
  const series = await prisma.classSeries.findMany({
    where: {
      active: true,
      OR: [{ generatedUntil: null }, { generatedUntil: { lt: stringToDbDay(target) } }],
    },
  });
  for (const s of series) await generateSeries(s, target);
}

type SessionWithCounts = ClassSession & { _count: { bookings: number } };

/** Forme commune d'une séance, côté utilisatrice comme côté admin. */
export function serializeSession(s: SessionWithCounts, extra: { myBooking?: boolean } = {}) {
  const booked = s._count.bookings;
  const endsAt = new Date(s.startsAt.getTime() + s.durationMin * 60000);
  return {
    id: s.id,
    seriesId: s.seriesId,
    isRecurring: !!s.seriesId,
    title: s.title,
    description: s.description,
    instructor: s.instructor,
    location: s.location,
    level: s.level,
    startsAt: s.startsAt,
    endsAt,
    day: localDay(s.startsAt),
    startTime: localTime(s.startsAt),
    endTime: localTime(endsAt),
    durationMin: s.durationMin,
    capacity: s.capacity,
    booked,
    remaining: Math.max(0, s.capacity - booked),
    cancelled: s.cancelled,
    past: s.startsAt.getTime() < Date.now(),
    myBooking: extra.myBooking ?? false,
  };
}

/** Sélection Prisma : nombre de réservations actives d'une séance. */
export const bookedCount = { _count: { select: { bookings: { where: { status: "booked" } } } } } as const;
