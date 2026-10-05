import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { youtubeThumbnail } from "../lib/youtube.js";
import { durationMin, publishedWhere, serializeCourse, withUniverse } from "../lib/courseSerialize.js";

/**
 * Couverture d'un programme : l'image choisie par l'admin, sinon la vignette de
 * la première séance (elle-même issue de YouTube si le cours en vient).
 */
function programCover(p: {
  coverUrl: string | null;
  courses: { course: { thumbnailUrl: string | null; youtubeId: string | null } }[];
}): string | null {
  if (p.coverUrl) return p.coverUrl;
  for (const pc of p.courses) {
    if (pc.course.thumbnailUrl) return pc.course.thumbnailUrl;
    if (pc.course.youtubeId) return youtubeThumbnail(pc.course.youtubeId);
  }
  return null;
}

/** Séances publiées d'un programme, dans l'ordre. */
function programCourses() {
  return {
    where: { course: publishedWhere() },
    include: { course: { include: withUniverse } },
    orderBy: { order: "asc" as const },
  };
}

export const catalogRouter = Router();

catalogRouter.get("/universes", async (_req, res) => {
  const universes = await prisma.universe.findMany({
    orderBy: { order: "asc" },
    include: {
      courses: {
        where: { ...publishedWhere(), OR: [{ thumbnailUrl: { not: null } }, { youtubeId: { not: null } }] },
        select: { thumbnailUrl: true, youtubeId: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });
  res.json({
    universes: universes.map((u) => {
      const first = u.courses[0];
      return {
        id: u.id,
        slug: u.slug,
        label: u.label,
        bg: u.bg,
        fg: u.fg,
        dest: u.dest,
        order: u.order,
        // Photo de la tuile : l'image de l'univers, sinon la vignette de sa séance la plus récente.
        imageUrl: u.imagePath,
        fallbackImageUrl: first ? first.thumbnailUrl ?? (first.youtubeId ? youtubeThumbnail(first.youtubeId) : null) : null,
      };
    }),
  });
});

catalogRouter.get("/courses", async (req, res) => {
  const { universe, category, search, kind, mood } = req.query as Record<string, string | undefined>;
  const hasAccess = req.user?.hasAccess ?? false;

  const courses = await prisma.course.findMany({
    where: {
      ...publishedWhere(),
      ...(mood ? { moods: { has: mood } } : {}),
      ...(universe ? { universe: { label: universe } } : {}),
      ...(category && category !== "Tous" ? { category } : {}),
      ...(kind ? { kind } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: withUniverse,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  res.json({ courses: courses.map((c) => serializeCourse(c, hasAccess)) });
});

catalogRouter.get("/courses/:id", async (req, res) => {
  const hasAccess = req.user?.hasAccess ?? false;
  const course = await prisma.course.findFirst({
    where: { id: req.params.id, ...(req.user?.isAdmin ? {} : publishedWhere()) },
    include: withUniverse,
  });
  if (!course) return res.status(404).json({ error: "Cours introuvable" });
  res.json({ course: serializeCourse(course, hasAccess, { includeMedia: true }) });
});

catalogRouter.get("/programs", async (req, res) => {
  const routine = req.query.routine;
  const programs = await prisma.program.findMany({
    where: { published: true, ...(routine !== undefined ? { isRoutine: routine === "true" } : {}) },
    include: { courses: programCourses() },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const hasAccess = req.user?.hasAccess ?? false;
  res.json({
    programs: programs.map((p) => {
      const durations = p.courses.map((pc) => durationMin(pc.course));
      return {
        id: p.id,
        title: p.title,
        description: p.description ?? p.subtitle,
        coverUrl: programCover(p),
        isRoutine: p.isRoutine,
        sessionCount: p.courses.length,
        totalDurationMin: durations.reduce((n, d) => n + d, 0),
        meta: `${p.courses.length} séance${p.courses.length === 1 ? "" : "s"}${
          p.courses.length ? " · " + minMaxDuration(durations) : ""
        }`,
        locked: p.courses.length > 0 && p.courses.every((pc) => pc.course.premium && !hasAccess),
      };
    }),
  });
});

function minMaxDuration(durations: number[]): string {
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  return min === max ? `${min} min` : `${min}-${max} min`;
}

catalogRouter.get("/programs/:id", async (req, res) => {
  const hasAccess = req.user?.hasAccess ?? false;
  const program = await prisma.program.findFirst({
    where: { id: req.params.id, ...(req.user?.isAdmin ? {} : { published: true }) },
    include: { courses: programCourses() },
  });
  if (!program) return res.status(404).json({ error: "Programme introuvable" });

  let progressByCourse = new Map<string, boolean>();
  if (req.user) {
    const rows = await prisma.watchProgress.findMany({
      where: { userId: req.user.id, courseId: { in: program.courses.map((pc) => pc.courseId) } },
    });
    progressByCourse = new Map(rows.map((r) => [r.courseId, r.completed]));
  }

  res.json({
    program: {
      id: program.id,
      title: program.title,
      description: program.description ?? program.subtitle,
      coverUrl: programCover(program),
      isRoutine: program.isRoutine,
      sessions: program.courses.map((pc, i) => ({
        ...serializeCourse(pc.course, hasAccess),
        order: i + 1,
        title: `${i + 1}. ${pc.course.title}`,
        done: progressByCourse.get(pc.courseId) ?? false,
      })),
    },
  });
});

catalogRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { key: "asc" } });
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  res.json({
    plans: plans.map((p) => ({
      key: p.key,
      title: p.label,
      price: (p.priceCents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",") + " €",
      priceCents: p.priceCents,
    })),
    trialDays: settings?.trialDays ?? 0,
  });
});

catalogRouter.get("/experts", async (_req, res) => {
  const experts = await prisma.expert.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({
    experts: experts.map((e) => ({ id: e.id, name: e.name, role: e.role, initial: e.name.slice(0, 1).toUpperCase() })),
  });
});
