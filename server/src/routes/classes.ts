import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { bookedCount, ensureGenerated, serializeSession } from "../lib/classes.js";
import { addDays, dayBounds, isDay, today } from "../lib/time.js";

/** Cours physiques au studio : planning et réservations, côté utilisatrice. */
export const classesRouter = Router();

classesRouter.use(requireAuth);

/** Séances entre `from` et `to` (jours inclus, heure de Paris), 14 jours par défaut. */
classesRouter.get("/classes", async (req, res) => {
  const from = typeof req.query.from === "string" && isDay(req.query.from) ? req.query.from : today();
  const toParam = typeof req.query.to === "string" && isDay(req.query.to) ? req.query.to : addDays(from, 13);
  // Pas plus de 62 jours par requête.
  const to = toParam > addDays(from, 61) ? addDays(from, 61) : toParam;
  await ensureGenerated(to);

  const userId = req.user!.id;
  const sessions = await prisma.classSession.findMany({
    where: { startsAt: { gte: dayBounds(from).start, lt: dayBounds(to).end } },
    include: { ...bookedCount, bookings: { where: { userId, status: "booked" }, select: { id: true } } },
    orderBy: { startsAt: "asc" },
  });
  res.json({
    from,
    to,
    sessions: sessions.map((s) => serializeSession(s, { myBooking: s.bookings.length > 0 })),
  });
});

/** Mes réservations à venir. */
classesRouter.get("/classes/mine", async (req, res) => {
  const bookings = await prisma.classBooking.findMany({
    where: { userId: req.user!.id, status: "booked", session: { startsAt: { gte: new Date(Date.now() - 60 * 60000) } } },
    include: { session: { include: bookedCount } },
    orderBy: { session: { startsAt: "asc" } },
  });
  res.json({ sessions: bookings.map((b) => serializeSession(b.session, { myBooking: true })) });
});

class BookingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Réserver une place. La séance est verrouillée (FOR UPDATE) le temps de
 * compter les inscrites : deux réservations simultanées ne peuvent pas
 * dépasser la capacité.
 */
classesRouter.post("/classes/:id/book", async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user!.id;
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ capacity: number; cancelled: boolean; starts_at: Date }[]>`
        SELECT capacity, cancelled, starts_at FROM public.class_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
      const s = rows[0];
      if (!s) throw new BookingError(404, "Cours introuvable");
      if (s.cancelled) throw new BookingError(409, "Ce cours a été annulé");
      if (new Date(s.starts_at).getTime() < Date.now()) throw new BookingError(409, "Ce cours a déjà commencé");
      const existing = await tx.classBooking.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
      if (existing?.status === "booked") return;
      const taken = await tx.classBooking.count({ where: { sessionId, status: "booked" } });
      if (taken >= s.capacity) throw new BookingError(409, "Ce cours est complet");
      await tx.classBooking.upsert({
        where: { sessionId_userId: { sessionId, userId } },
        create: { sessionId, userId },
        update: { status: "booked", cancelledAt: null, createdAt: new Date() },
      });
    });
  } catch (err) {
    if (err instanceof BookingError) return res.status(err.status).json({ error: err.message });
    if ((err as { code?: string }).code === "P2010" || (err as { code?: string }).code === "22P02") {
      return res.status(404).json({ error: "Cours introuvable" });
    }
    throw err;
  }
  res.status(201).json({ ok: true });
});

/** Annuler sa réservation, jusqu'au début du cours. */
classesRouter.delete("/classes/:id/book", async (req, res) => {
  const booking = await prisma.classBooking
    .findUnique({
      where: { sessionId_userId: { sessionId: req.params.id, userId: req.user!.id } },
      include: { session: true },
    })
    .catch(() => null);
  if (!booking || booking.status !== "booked") return res.json({ ok: true });
  if (booking.session.startsAt.getTime() < Date.now()) {
    return res.status(409).json({ error: "Le cours a déjà commencé" });
  }
  await prisma.classBooking.update({ where: { id: booking.id }, data: { status: "cancelled", cancelledAt: new Date() } });
  res.json({ ok: true });
});
