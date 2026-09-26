import type { CookieOptions, Response } from "express";
import type { AuthSession } from "./supabase.js";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Le jeton d'accès Supabase expire au bout d'une heure ; le cookie vit plus
// longtemps pour que le middleware puisse le renouveler avec le refresh token.
export const sessionCookies = {
  access: "yogella_at",
  refresh: "yogella_rt",
};

const options: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: MAX_AGE_MS,
  path: "/",
};

export function setSessionCookies(res: Response, session: AuthSession) {
  res.cookie(sessionCookies.access, session.access_token, options);
  res.cookie(sessionCookies.refresh, session.refresh_token, options);
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(sessionCookies.access, { path: "/" });
  res.clearCookie(sessionCookies.refresh, { path: "/" });
}
