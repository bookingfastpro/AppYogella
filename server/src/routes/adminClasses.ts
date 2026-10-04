import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, displayName } from "../middleware/auth.js";
import { HORIZON_DAYS, bookedCount, ensureGenerated, generateSeries, serializeSession } from "../lib/classes.js";
import { addDays, dayBounds, isDay, isTime, localDay, localTime, stringToDbDay, today, zonedToUtc } from "../lib/time.js";

/** Planning des cours physiques, côté administration. */
export const adminClassesRouter = Router();

adminClassesRouter.use(requireAdmin);

/** Séances d'une journée avec la liste des inscrites. */
adminClassesRouter.get("/classes", async (req, res) => {
  const day = typeof req.query.date === "string" && isDay(req.query.date) ? req.query.date : today();
  await ensureGenerated(day);
  const { start, end } = dayBounds(day);
  const sessions = await prisma.classSession.findMany({
    where: { startsAt: { gte: start, lt: end } },
    include: {
      ...bookedCount,
      bookings: {
        where: { status: "booked" },
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
      },
      series: { select: { weekdays: true, startDate: true, endDate: true, active: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Jours de la semaine affichée qui ont au moins un cours (pastilles du sélecteur).
  const weekStart = addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
  const weekSessions = await prisma.classSession.findMany({
    where: { startsAt: { gte: dayBounds(weekStart).start, lt: dayBounds(addDays(weekStart, 6)).end }, cancelled: false },
    select: { startsAt: true },
  });

  res.json({
    date: day,
    busyDays: [...new Set(weekSessions.map((s) => localDay(s.startsAt)))],
    sessions: sessions.map((s) => ({
      ...serializeSession(s),
      series: s.series && {
        weekdays: s.series.weekdays,
        active: s.series.active,
        endDate: s.series.endDate ? s.series.endDate.toISOString().slice(0, 10) : null,
      },
      attendees: s.bookings.map((b) => ({
        id: b.user.id,
        name: displayName(b.user),
        email: b.user.email,
        bookedAt: b.createdAt,
      })),
    })),
  });
});

const baseFields = {
  title: z.string().trim().min(1, "Donnez un titre au cours").max(80),
  description: z.string().trim().max(1000).optional().transform((v) => v || null),
  instructor: z.string().trim().max(80).optional().transform((v) => v || null),
  location: z.string().trim().max(120).optional().transform((v) => v || null),
  level: z.string().trim().max(40).optional().transform((v) => v || null),
  capacity: z.coerce.number().int().min(1, "Au moins une place").max(500),
  durationMin: z.coerce.number().int().min(5, "Durée trop courte").max(600),
  time: z.string().refine(isTime, "Heure invalide (HH:MM)"),
};

const createSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("once"), date: z.string().refine(isDay, "Date invalide"), ...baseFields }),
  z.object({
    mode: z.literal("recurring"),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Choisissez au moins un jour"),
    startDate: z.string().refine(isDay, "Date de début invalide"),
    endDate: z.string().refine(isDay, "Date de fin invalide").optional().nullable(),
    ...baseFields,
  }),
]);

adminClassesRouter.post("/classes", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Champs invalides" });
  const { mode, time, ...rest } = parsed.data;
  const fields = {
    title: rest.title,
    description: rest.description,
    instructor: rest.instructor,
    location: rest.location,
    level: rest.level,
    capacity: rest.capacity,
    durationMin: rest.durationMin,
  };

  if (mode === "once") {
    const startsAt = zonedToUtc(parsed.data.date, time);
    if (startsAt.getTime() < Date.now()) return res.status(400).json({ error: "Cette date est déjà passée" });
    const session = await prisma.classSession.create({ data: { ...fields, startsAt } });
    return res.status(201).json({ id: session.id, count: 1 });
  }

  const { weekdays, startDate, endDate } = parsed.data;
  if (endDate && endDate < startDate) return res.status(400).json({ error: "La date de fin précède la date de début" });
  const series = await prisma.classSeries.create({
    data: {
      ...fields,
      weekdays: [...new Set(weekdays)].sort(),
      startTime: time,
      startDate: stringToDbDay(startDate),
      endDate: endDate ? stringToDbDay(endDate) : null,
    },
  });
  await generateSeries(series, addDays(today() > startDate ? today() : startDate, HORIZON_DAYS));
  const count = await prisma.classSession.count({ where: { seriesId: series.id } });
  if (count === 0) {
    await prisma.classSeries.delete({ where: { id: series.id } });
    return res.status(400).json({ error: "Aucune séance ne tombe sur ces jours dans la période choisie" });
  }
  res.status(201).json({ id: series.id, count });
});

const updateSchema = z.object({
  ...baseFields,
  date: z.string().refine(isDay, "Date invalide"),
  cancelled: z.boolean(),
}).partial();

/** Modifier une séance (une seule occurrence, même si elle vient d'une série). */
adminClassesRouter.patch("/classes/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Champs invalides" });
  const current = await prisma.classSession
    .findUnique({ where: { id: req.params.id }, include: bookedCount })
    .catch(() => null);
  if (!current) return res.status(404).json({ error: "Cours introuvable" });

  const { date, time, ...rest } = parsed.data;
  if (rest.capacity !== undefined && rest.capacity < current._count.bookings) {
    return res.status(400).json({ error: `${current._count.bookings} personnes sont déjà inscrites : capacité trop faible` });
  }
  const data: Record<string, unknown> = { ...rest };
  if (date || time) {
    data.startsAt = zonedToUtc(date ?? localDay(current.startsAt), time ?? localTime(current.startsAt));
  }
  const session = await prisma.classSession.update({ where: { id: current.id }, data, include: bookedCount });
  res.json({ session: serializeSession(session) });
});

/** Supprimer une séance et ses réservations (préférer l'annulation si des personnes sont inscrites). */
adminClassesRouter.delete("/classes/:id", async (req, res) => {
  await prisma.classSession.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

/** Arrêter une série : plus de nouvelles séances, et les séances à venir sont annulées. */
adminClassesRouter.post("/class-series/:id/stop", async (req, res) => {
  const series = await prisma.classSeries.findUnique({ where: { id: req.params.id } }).catch(() => null);
  if (!series) return res.status(404).json({ error: "Série introuvable" });
  const now = new Date();
  await prisma.$transaction([
    prisma.classSeries.update({ where: { id: series.id }, data: { active: false, endDate: stringToDbDay(today()) } }),
    prisma.classSession.updateMany({ where: { seriesId: series.id, startsAt: { gt: now } }, data: { cancelled: true } }),
  ]);
  res.json({ ok: true });
});

/** Retirer une inscrite d'une séance. */
adminClassesRouter.delete("/classes/:id/bookings/:userId", async (req, res) => {
  await prisma.classBooking
    .updateMany({
      where: { sessionId: req.params.id, userId: req.params.userId, status: "booked" },
      data: { status: "cancelled", cancelledAt: new Date() },
    })
    .catch(() => null);
  res.json({ ok: true });
});
