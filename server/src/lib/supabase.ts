/**
 * Supabase Auth (GoTrue), appelé depuis le serveur uniquement.
 *
 * Le navigateur ne parle jamais à Supabase : l'API relaie connexion et
 * inscription, puis garde les jetons dans des cookies httpOnly. Les jetons
 * d'accès sont signés en ES256 ; on les vérifie localement avec la clé publique
 * (JWKS), sans aller-retour réseau à chaque requête.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} n'est pas défini — configurez Supabase dans server/.env.`);
  return value;
}

const SUPABASE_URL = env("SUPABASE_URL").replace(/\/+$/, "");
const PUBLISHABLE_KEY = env("SUPABASE_PUBLISHABLE_KEY");
const SECRET_KEY = env("SUPABASE_SECRET_KEY");
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

const jwks = createRemoteJWKSet(
  new URL(process.env.SUPABASE_JWKS_URL || `${AUTH_URL}/.well-known/jwks.json`),
);

export class AuthApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

async function gotrue<T>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
  const key = init.admin ? SECRET_KEY : PUBLISHABLE_KEY;
  const res = await fetch(`${AUTH_URL}${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(init.admin ? { Authorization: `Bearer ${key}` } : {}),
      ...init.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = String(data.msg ?? data.error_description ?? data.message ?? data.error ?? `Erreur ${res.status}`);
    throw new AuthApiError(res.status, (data.error_code ?? data.code) as string | undefined, message);
  }
  return data as T;
}

export function signInWithPassword(email: string, password: string) {
  return gotrue<AuthSession>("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refreshSession(refreshToken: string) {
  return gotrue<AuthSession>("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

/** Révoque la session côté Supabase. Sans gravité si elle a déjà expiré. */
export async function signOut(accessToken: string) {
  await gotrue("/logout?scope=local", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined);
}

/**
 * Crée un compte déjà confirmé. L'inscription passe par l'API d'administration
 * pour que la cliente soit connectée tout de suite, sans e-mail de confirmation.
 */
export function adminCreateUser(email: string, password: string, fullName: string) {
  return gotrue<{ id: string; email: string }>("/admin/users", {
    method: "POST",
    admin: true,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
}

export function adminUpdateUserEmail(userId: string, email: string) {
  return gotrue<{ id: string; email: string }>(`/admin/users/${userId}`, {
    method: "PUT",
    admin: true,
    body: JSON.stringify({ email, email_confirm: true }),
  });
}

/** Identifiant du compte si le jeton d'accès est valide et non expiré. */
export async function verifyAccessToken(token: string): Promise<{ userId: string; email?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: AUTH_URL, audience: "authenticated" });
    if (!payload.sub) return null;
    return { userId: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch {
    return null;
  }
}
