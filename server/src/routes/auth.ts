import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { clearSessionCookies, sessionCookies, setSessionCookies } from "../lib/auth.js";
import { AuthApiError, adminCreateUser, signInWithPassword, signOut } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeMe } from "../lib/serialize.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(200),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Champs invalides", details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;

  let userId: string;
  try {
    userId = (await adminCreateUser(email, password, name)).id;
  } catch (err) {
    if (err instanceof AuthApiError && (err.code === "email_exists" || err.status === 422)) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    }
    if (err instanceof AuthApiError && err.code === "weak_password") {
      return res.status(400).json({ error: "Mot de passe trop faible" });
    }
    throw err;
  }

  // Le trigger handle_new_user a créé le profil (id, email) ; on complète le nom.
  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, email, fullName: name },
    update: { fullName: name },
  });

  const session = await signInWithPassword(email, password);
  setSessionCookies(res, session);

  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId }, include: { subscription: true } });
  res.status(201).json({ user: serializeMe(profile) });
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const { email, password } = parsed.data;

  let session;
  try {
    session = await signInWithPassword(email, password);
  } catch (err) {
    if (err instanceof AuthApiError && err.code === "email_not_confirmed") {
      return res.status(403).json({ error: "Adresse e-mail non confirmée" });
    }
    if (err instanceof AuthApiError && err.status < 500) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    throw err;
  }

  const profile = await prisma.profile.upsert({
    where: { id: session.user.id },
    create: { id: session.user.id, email: session.user.email ?? email },
    update: {},
    include: { subscription: true },
  });
  if (!profile.active) {
    await signOut(session.access_token);
    return res.status(403).json({ error: "Ce compte a été suspendu" });
  }

  setSessionCookies(res, session);
  res.json({ user: serializeMe(profile) });
});

authRouter.post("/logout", async (req, res) => {
  const access = req.cookies?.[sessionCookies.access];
  if (access) await signOut(access);
  clearSessionCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  if (!profile) return res.status(401).json({ error: "Authentification requise" });
  res.json({ user: serializeMe(profile) });
});
