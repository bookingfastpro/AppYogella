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
