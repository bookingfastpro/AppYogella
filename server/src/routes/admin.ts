import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadVideo, uploadImage } from "../lib/upload.js";
import { parseYoutubeId, youtubeThumbnail } from "../lib/youtube.js";
import { durationMin } from "../lib/courseSerialize.js";
import { uniqueSlug } from "../lib/slug.js";
import { AuthApiError, adminUpdateUserEmail } from "../lib/supabase.js";
import { displayName } from "../middleware/auth.js";
import { manualCustomerId } from "./subscription.js";
import { MOOD_KEYS } from "../lib/moods.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// ───────────────────────── Courses ─────────────────────────

adminRouter.get("/courses", async (_req, res) => {
  const courses = await prisma.course.findMany({ include: { universe: true }, orderBy: { createdAt: "desc" } });
  res.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      kind: c.kind,
      universe: c.universe.label,
      category: c.category,
      moods: c.moods,
      durationMin: durationMin(c),
      meta: `${c.universe.label} · ${durationMin(c)} min${c.publishedAt ? "" : " · brouillon"}`,
      premium: c.premium,
      videoUrl: c.videoUrl,
      youtubeId: c.youtubeId,
      // Ce que le front affiche ; l'admin voit donc la miniature YouTube dès
      // qu'aucune image n'a été téléversée.
      thumbnailUrl: c.thumbnailUrl ?? (c.youtubeId ? youtubeThumbnail(c.youtubeId) : null),
      // Vignette réellement stockée, pour savoir si l'admin a choisi une image.
      customThumbnailUrl: c.thumbnailUrl,
    })),
  });
});

const courseSchema = z.object({
  title: z.string().trim().min(1),
  durationMin: z.coerce.number().int().positive(),
  universe: z.string().trim().min(1),
  category: z.string().trim().optional(),
  // Doublons retirés ; l'ordre suit celui de l'accueil.
  moods: z
    .array(z.enum(MOOD_KEYS))
    .optional()
    .transform((v) => (v === undefined ? undefined : MOOD_KEYS.filter((k) => v.includes(k)))),
  premium: z.boolean().default(true),
  kind: z.enum(["COURSE", "ARTICLE"]).default("COURSE"),
  videoUrl: z.string().optional(),
  // L'administratrice colle une URL YouTube sous n'importe quelle forme ; on ne
  // stocke que l'identifiant. Une chaîne vide efface la vidéo YouTube.
  youtubeId: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const raw = v.trim();
      if (raw === "") return null; // champ vidé : on retire la vidéo YouTube
      const id = parseYoutubeId(raw);
      if (!id) {
        ctx.addIssue({ code: "custom", message: "Lien YouTube invalide" });
        return z.NEVER;
      }
      return id;
    }),
  // Champ vidé = on retire l'image choisie et on retombe sur la miniature
  // YouTube. Sans cette conversion, "" serait stocké tel quel et le repli
  // `?? youtubeThumbnail(...)` ne se déclencherait jamais.
  thumbnailUrl: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim())),
  body: z.string().optional(),
  authorName: z.string().optional(),
  authorRole: z.string().optional(),
});

/** Champs du formulaire → colonnes de la table videos. */
async function courseData(input: Partial<z.infer<typeof courseSchema>>) {
  const { universe, durationMin: minutes, ...rest } = input;
  let universeId: string | undefined;
  if (universe !== undefined) {
    const found = await prisma.universe.findUnique({ where: { label: universe } });
    if (!found) return { error: "Univers inconnu" } as const;
    universeId = found.id;
  }
  return {
    data: {
      ...rest,
      ...(universeId ? { universeId } : {}),
      ...(minutes !== undefined ? { durationSeconds: minutes * 60 } : {}),
    },
  } as const;
}

adminRouter.post("/courses", async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Champs invalides" });
  }
  const mapped = await courseData(parsed.data);
  if ("error" in mapped) return res.status(400).json({ error: mapped.error });
  const { universeId, durationSeconds, ...fields } = mapped.data;
  const slug = await uniqueSlug(parsed.data.title, async (s) => !!(await prisma.course.findUnique({ where: { slug: s } })));
  const course = await prisma.course.create({
    data: {
      ...fields,
      title: parsed.data.title,
      universeId: universeId!,
      durationSeconds: durationSeconds!,
      slug,
      authorName: fields.authorName ?? "",
      body: fields.body ?? "",
      publishedAt: new Date(),
    },
  });
  res.status(201).json({ course });
});

const courseUpdateSchema = courseSchema.partial();

adminRouter.patch("/courses/:id", async (req, res) => {
  const parsed = courseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Champs invalides" });
  }
  const mapped = await courseData(parsed.data);
  if ("error" in mapped) return res.status(400).json({ error: mapped.error });
  const course = await prisma.course
    .update({ where: { id: req.params.id }, data: mapped.data })
    .catch(() => null);
  if (!course) return res.status(404).json({ error: "Cours introuvable" });
  res.json({ course });
});

adminRouter.delete("/courses/:id", async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

adminRouter.post("/uploads/video", (req, res) => {
  uploadVideo(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

adminRouter.post("/uploads/image", (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ───────────────────────── Programs ─────────────────────────

adminRouter.get("/programs", async (_req, res) => {
  const programs = await prisma.program.findMany({
    include: { courses: { orderBy: { order: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json({
    programs: programs.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      coverUrl: p.coverUrl,
      isRoutine: p.isRoutine,
      videoIds: p.courses.map((pc) => pc.courseId),
      meta: `${p.courses.length} vidéo${p.courses.length === 1 ? "" : "s"} liée${
        p.courses.length === 1 ? "" : "s"
      }${p.description ? " · " + p.description : ""}`,
    })),
  });
});

const programSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  coverUrl: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim())),
  isRoutine: z.boolean().optional(),
});

adminRouter.post("/programs", async (req, res) => {
  const parsed = programSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const slug = await uniqueSlug(parsed.data.title, async (s) => !!(await prisma.program.findUnique({ where: { slug: s } })));
  const program = await prisma.program.create({ data: { ...parsed.data, slug } });
  res.status(201).json({ program });
});

adminRouter.patch("/programs/:id", async (req, res) => {
  const parsed = programSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const program = await prisma.program
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!program) return res.status(404).json({ error: "Programme introuvable" });
  res.json({ program });
});

adminRouter.delete("/programs/:id", async (req, res) => {
  await prisma.program.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

adminRouter.post("/programs/:id/videos/:courseId", async (req, res) => {
  const { id: programId, courseId } = req.params;
  const count = await prisma.programCourse.count({ where: { programId } });
  const link = await prisma.programCourse
    .create({ data: { programId, courseId, order: count } })
    .catch(() => null);
  if (!link) return res.status(409).json({ error: "Déjà liée ou identifiants invalides" });
  res.status(201).json({ ok: true });
});

adminRouter.delete("/programs/:id/videos/:courseId", async (req, res) => {
  await prisma.programCourse.deleteMany({
    where: { programId: req.params.id, courseId: req.params.courseId },
  });
  res.json({ ok: true });
});

// ───────────────────────── Users ─────────────────────────

const PLAN_ORDER = ["Aucun", "Essai", "Mensuel", "Annuel"] as const;
/** « Actif » : abonnement actif saisi sans formule (import de l'ancienne app). */
type PlanLabel = (typeof PLAN_ORDER)[number] | "Actif";

function planLabelFor(status: string | undefined, plan: string | null | undefined): PlanLabel {
  if (status === "trialing") return "Essai";
  if (status === "active" && plan === "MONTHLY") return "Mensuel";
  if (status === "active" && plan === "ANNUAL") return "Annuel";
  if (status === "active") return "Actif";
  return "Aucun";
}

adminRouter.get("/users", async (_req, res) => {
  const profiles = await prisma.profile.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    users: profiles.map((p) => {
      const name = displayName(p);
      return {
        id: p.id,
        name,
        email: p.email,
        initial: name.slice(0, 1).toUpperCase(),
        isAdmin: p.isAdmin,
        active: p.active,
        plan: planLabelFor(p.subscription?.status, p.subscription?.plan),
      };
    }),
    stats: {
      total: profiles.length,
      activeSubscriptions: profiles.filter(
        (p) => p.active && (p.subscription?.status === "active" || p.subscription?.status === "trialing"),
      ).length,
    },
  });
});

const userUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  isAdmin: z.boolean().optional(),
  active: z.boolean().optional(),
  cyclePlan: z.boolean().optional(),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, include: { subscription: true } });
  if (!profile) return res.status(404).json({ error: "Utilisateur introuvable" });

  // Une administratrice ne peut pas se retirer ses propres droits ni se
  // désactiver : ce serait un aller sans retour depuis l'interface.
  const isSelf = req.user?.id === profile.id;
  if (isSelf && (parsed.data.isAdmin === false || parsed.data.active === false)) {
    return res.status(400).json({ error: "Vous ne pouvez pas retirer vos propres accès" });
  }

  const { name, email, isAdmin, active } = parsed.data;

  // L'e-mail de connexion appartient à Supabase Auth : on le change là-bas
  // d'abord, puis on reporte la valeur sur le profil.
  if (email !== undefined && email !== profile.email) {
    try {
      await adminUpdateUserEmail(profile.id, email);
    } catch (err) {
      if (err instanceof AuthApiError && (err.code === "email_exists" || err.status === 422)) {
        return res.status(409).json({ error: "Cette adresse email est déjà utilisée" });
      }
      throw err;
    }
  }

  if (name !== undefined || email !== undefined || isAdmin !== undefined || active !== undefined) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...(name !== undefined ? { fullName: name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(isAdmin !== undefined ? { isAdmin } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
  }

  if (parsed.data.cyclePlan) {
    const current = planLabelFor(profile.subscription?.status, profile.subscription?.plan);
    // Un abonnement « Actif » sans formule passe à Mensuel plutôt que de perdre l'accès.
    const from = current === "Actif" ? PLAN_ORDER.indexOf("Essai") : PLAN_ORDER.indexOf(current);
    const next = PLAN_ORDER[(from + 1) % PLAN_ORDER.length];
    const data =
      next === "Aucun"
        ? { status: "canceled", plan: null }
        : next === "Essai"
        ? { status: "trialing", plan: null }
        : next === "Mensuel"
        ? { status: "active", plan: "MONTHLY" }
        : { status: "active", plan: "ANNUAL" };
    await prisma.subscription.upsert({
      where: { userId: profile.id },
      create: { userId: profile.id, stripeCustomerId: manualCustomerId(profile.id), isManual: true, ...data },
      update: { ...data, isManual: true },
    });
  }

  const updated = await prisma.profile.findUniqueOrThrow({ where: { id: profile.id }, include: { subscription: true } });
  res.json({
    user: {
      id: updated.id,
      name: displayName(updated),
      email: updated.email,
      active: updated.active,
      plan: planLabelFor(updated.subscription?.status, updated.subscription?.plan),
    },
  });
});

// ───────────────────────── Plans & settings ─────────────────────────

adminRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { key: "asc" } });
  const counts = await prisma.subscription.groupBy({
    by: ["plan"],
    where: { status: "active" },
    _count: true,
  });
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  res.json({
    plans: plans.map((p) => ({
      key: p.key,
      title: p.label,
      price: (p.priceCents / 100).toFixed(2).replace(".", ",") + " €",
      priceCents: p.priceCents,
      active: p.active,
      subscriberCount: counts.find((c) => c.plan === p.key)?._count ?? 0,
    })),
    trialDays: settings?.trialDays ?? 0,
  });
});

const planUpdateSchema = z.object({
  price: z.string().optional(),
  active: z.boolean().optional(),
});

adminRouter.patch("/plans/:key", async (req, res) => {
  const key = req.params.key.toUpperCase();
  if (key !== "MONTHLY" && key !== "ANNUAL") return res.status(400).json({ error: "Formule inconnue" });
  const parsed = planUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });

  const data: { priceCents?: number; active?: boolean } = {};
  if (parsed.data.price !== undefined) {
    const cents = Math.round(parseFloat(parsed.data.price.replace(",", ".").replace(/[^\d.]/g, "")) * 100);
    if (Number.isFinite(cents) && cents > 0) data.priceCents = cents;
  }
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const plan = await prisma.plan.update({ where: { key }, data });
  res.json({ plan });
});

adminRouter.patch("/settings", async (req, res) => {
  const parsed = z.object({ trialDays: z.number().int().min(0).max(60) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", trialDays: parsed.data.trialDays },
    update: { trialDays: parsed.data.trialDays },
  });
  res.json({ settings });
});

// ───────────────────────── Notifications ─────────────────────────

adminRouter.get("/notifications", async (_req, res) => {
  const [notifications, accounts] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { reads: true } } },
    }),
    prisma.profile.count({ where: { active: true } }),
  ]);
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      readCount: n._count.reads,
    })),
    accounts,
  });
});

const notificationSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre à la notification").max(80, "Titre trop long (80 caractères max.)"),
  body: z.string().trim().min(1, "Écrivez le message").max(600, "Message trop long (600 caractères max.)"),
});

adminRouter.post("/notifications", async (req, res) => {
  const parsed = notificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Champs invalides" });
  }
  const notification = await prisma.notification.create({ data: parsed.data });
  res.status(201).json({ notification });
});

adminRouter.delete("/notifications/:id", async (req, res) => {
  await prisma.notification.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// ───────────────────────── Stats ─────────────────────────

adminRouter.get("/stats", async (_req, res) => {
  const plans = await prisma.plan.findMany();
  const counts = await prisma.subscription.groupBy({ by: ["plan", "status"], _count: true });
  const activeMonthly = counts.find((c) => c.plan === "MONTHLY" && c.status === "active")?._count ?? 0;
  const activeAnnual = counts.find((c) => c.plan === "ANNUAL" && c.status === "active")?._count ?? 0;
  const activeOther = counts.filter((c) => c.plan === null && c.status === "active").reduce((n, c) => n + c._count, 0);
  const trialCount = counts.filter((c) => c.status === "trialing").reduce((n, c) => n + c._count, 0);
  const monthly = plans.find((p) => p.key === "MONTHLY");
  const annual = plans.find((p) => p.key === "ANNUAL");
  const mrr =
    (monthly ? (activeMonthly * monthly.priceCents) / 100 : 0) +
    (annual ? (activeAnnual * annual.priceCents) / 100 / 12 : 0);

  res.json({
    mrr: Math.round(mrr).toLocaleString("fr-FR") + " €",
    activeCount: activeMonthly + activeAnnual + activeOther,
    trialCount,
  });
});
