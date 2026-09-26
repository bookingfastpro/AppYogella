import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { clearSessionCookies, sessionCookies, setSessionCookies } from "../lib/auth.js";
import { refreshSession, verifyAccessToken } from "../lib/supabase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        isAdmin: boolean;
        hasAccess: boolean;
      };
    }
  }
}

/** Seuls ces statuts Stripe donnent accès au contenu premium. */
export function isSubscriptionActive(status?: string | null): boolean {
  return status === "active" || status === "trialing";
}

export function displayName(profile: { fullName: string | null; email: string }): string {
  return profile.fullName?.trim() || profile.email.split("@")[0];
}

/** Compte courant : jeton d'accès valide, sinon renouvelé via le refresh token. */
async function resolveSession(req: Request, res: Response): Promise<{ userId: string; email?: string } | null> {
  const access = req.cookies?.[sessionCookies.access];
  if (access) {
    const claims = await verifyAccessToken(access);
    if (claims) return claims;
  }
  const refresh = req.cookies?.[sessionCookies.refresh];
  if (!refresh) return null;
  try {
    const session = await refreshSession(refresh);
    setSessionCookies(res, session);
    return { userId: session.user.id, email: session.user.email };
  } catch {
    clearSessionCookies(res);
    return null;
  }
}

export async function attachUser(req: Request, res: Response, next: NextFunction) {
  const session = await resolveSession(req, res);
  if (!session) return next();

  let profile = await prisma.profile.findUnique({
    where: { id: session.userId },
    include: { subscription: true },
  });
  // Le trigger handle_new_user crée normalement le profil ; on rattrape un
  // compte qui en serait dépourvu plutôt que de le bloquer.
  if (!profile && session.email) {
    profile = await prisma.profile.create({
      data: { id: session.userId, email: session.email },
      include: { subscription: true },
    });
  }
  if (!profile || !profile.active) return next();

  req.user = {
    id: profile.id,
    name: displayName(profile),
    email: profile.email,
    isAdmin: profile.isAdmin,
    hasAccess: isSubscriptionActive(profile.subscription?.status),
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  if (!req.user.isAdmin) return res.status(403).json({ error: "Accès administrateur requis" });
  next();
}
