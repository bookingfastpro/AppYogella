import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { durationMin, serializeCourse, withUniverse } from "../lib/courseSerialize.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/favorites", async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: { course: { include: withUniverse } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ favorites: favorites.map((f) => serializeCourse(f.course, req.user!.hasAccess)) });
});

userRouter.post("/favorites/:courseId", async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
  if (!course) return res.status(404).json({ error: "Cours introuvable" });
  await prisma.favorite.upsert({
    where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    create: { userId: req.user!.id, courseId: course.id },
    update: {},
  });
  res.status(201).json({ ok: true });
});

userRouter.delete("/favorites/:courseId", async (req, res) => {
  await prisma.favorite.deleteMany({
    where: { userId: req.user!.id, courseId: req.params.courseId },
  });
  res.json({ ok: true });
});

// ───────────────────────── Notifications ─────────────────────────

/** Nombre de notifications renvoyées : les plus récentes suffisent à la cloche. */
const NOTIFICATION_LIMIT = 30;

/** Notifications visibles par ce compte : annonces, plus les alertes admin s'il l'est. */
const visibleTo = (isAdmin: boolean) => (isAdmin ? {} : { audience: "all" });

userRouter.get("/notifications", async (req, res) => {
  const userId = req.user!.id;
  const [profile, notifications] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.notification.findMany({
      where: visibleTo(req.user!.isAdmin),
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_LIMIT,
      include: { reads: { where: { userId }, select: { readAt: true } } },
    }),
  ]);
  // Une annonce antérieure à l'inscription n'est pas « nouvelle » pour ce compte.
  const since = profile?.createdAt ?? new Date(0);
  const items = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    link: n.link,
    createdAt: n.createdAt,
    read: n.reads.length > 0 || n.createdAt < since,
  }));
  res.json({ notifications: items, unreadCount: items.filter((n) => !n.read).length });
});

const readSchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** Marque comme lues les notifications données, ou toutes celles non lues. */
userRouter.post("/notifications/read", async (req, res) => {
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const userId = req.user!.id;
  const ids =
    parsed.data.ids ??
    (
      await prisma.notification.findMany({
        where: { ...visibleTo(req.user!.isAdmin), reads: { none: { userId } } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: NOTIFICATION_LIMIT,
      })
    ).map((n) => n.id);
  if (ids.length) {
    await prisma.notificationRead.createMany({
      data: ids.map((notificationId) => ({ notificationId, userId })),
      skipDuplicates: true,
    });
  }
  res.json({ ok: true });
});

const progressSchema = z.object({
  courseId: z.string(),
  progressPct: z.number().min(0).max(1),
  completed: z.boolean().optional(),
});

userRouter.post("/progress", async (req, res) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const { courseId, progressPct, completed } = parsed.data;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: "Cours introuvable" });

  // La base stocke des secondes ; le lecteur raisonne en fraction de la durée.
  const progressSeconds = Math.round(progressPct * course.durationSeconds);
  const done = completed ?? progressPct >= 0.95;
  const row = await prisma.watchProgress.upsert({
    where: { userId_courseId: { userId: req.user!.id, courseId } },
    create: { userId: req.user!.id, courseId, progressSeconds, completed: done },
    update: { progressSeconds, completed: done },
  });
  res.json({ progress: { ...row, progressPct } });
});

userRouter.get("/practice", async (req, res) => {
  const userId = req.user!.id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recent = await prisma.watchProgress.findMany({
    where: { userId, updatedAt: { gte: weekAgo } },
  });

  const sessionCount = recent.length;
  const totalMin = recent.reduce((n, r) => n + r.progressSeconds / 60, 0);

  const dayBuckets = new Set(recent.map((r) => r.updatedAt.getDay()));
  const weekOrderJs = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const week = weekOrderJs.map((jsDay) => ({
    label: ["L", "M", "M", "J", "V", "S", "D"][weekOrderJs.indexOf(jsDay)],
    active: dayBuckets.has(jsDay),
  }));

  const last = await prisma.watchProgress.findFirst({
    where: { userId, completed: false },
    orderBy: { updatedAt: "desc" },
    include: { course: { include: withUniverse } },
  });

  const routines = await prisma.program.findMany({
    where: { isRoutine: true, published: true },
    include: { courses: { include: { course: true } } },
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    weekly: {
      sessionCount,
      totalMinutes: Math.round(totalMin),
      goalHours: 5,
      progressHours: Math.round((totalMin / 60) * 10) / 10,
    },
    week,
    resume: last
      ? {
          ...serializeCourse(last.course, req.user!.hasAccess),
          progressPct: Math.min(1, last.progressSeconds / last.course.durationSeconds),
        }
      : null,
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      meta: `${r.courses.reduce((n, c) => n + durationMin(c.course), 0)} min · ${r.courses.length} séance${
        r.courses.length === 1 ? "" : "s"
      }`,
      locked: r.courses.length > 0 && r.courses.every((c) => c.course.premium && !req.user!.hasAccess),
    })),
  });
});
