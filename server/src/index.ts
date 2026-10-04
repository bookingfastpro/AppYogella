import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { attachUser } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { userRouter } from "./routes/user.js";
import { subscriptionRouter, stripeWebhookHandler } from "./routes/subscription.js";
import { adminRouter } from "./routes/admin.js";
import { uploadDirPath } from "./lib/upload.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

// Behind Coolify's Traefik proxy: trust X-Forwarded-* so `secure` cookies and
// req.protocol behave correctly.
app.set("trust proxy", 1);

// WEB_ORIGIN accepts a comma-separated list. In the single-container deployment
// the SPA is served from this same origin, so CORS is only needed for the split
// dev setup (vite on :5173) or a separately hosted front end.
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Un POST same-origin envoie quand même un en-tête Origin : on l'accepte sans
  // exiger que le domaine public soit listé dans WEB_ORIGIN.
  const selfOrigin = `${req.protocol}://${req.get("host")}`;
  const allowed = !origin || origin === selfOrigin || allowedOrigins.includes(origin);
  cors({ origin: allowed, credentials: true })(req, res, next);
});

// Stripe webhook needs the raw body — mount before the JSON body parser.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(uploadDirPath),
  // Un fichier absent ne doit pas retomber sur le fallback SPA plus bas.
  (_req, res) => res.status(404).json({ error: "Fichier introuvable" }),
);

// Liveness: answers as soon as the process is up, used as the container healthcheck.
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Readiness: also proves the Supabase/Postgres connection works.
app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (err) {
    console.error("DB healthcheck failed", err);
    res.status(503).json({ ok: false, db: "down" });
  }
});

// Identification de la session : seulement pour l'API, après les routes de
// santé. Une base injoignable ne doit faire échouer ni le healthcheck ni le
// chargement de l'application elle-même.
app.use("/api", attachUser);

app.use("/api/auth", authRouter);
app.use("/api", catalogRouter);
app.use("/api", userRouter);
app.use("/api", subscriptionRouter);
app.use("/api/admin", adminRouter);

// Unmatched /api routes must 404 as JSON rather than falling through to the SPA.
app.use("/api", (_req, res) => res.status(404).json({ error: "Route inconnue" }));

// In production the built SPA is served from this same process, so the app is a
// single Coolify service on a single domain (no CORS, no cross-site cookies).
const here = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(process.env.WEB_DIST_DIR || path.join(here, "../../web/dist"));
const indexHtml = path.join(webDistDir, "index.html");

if (fs.existsSync(indexHtml)) {
  // Hashed asset filenames — safe to cache hard. index.html stays uncached.
  app.use("/assets", express.static(path.join(webDistDir, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(webDistDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    // Le shell référence des bundles au nom haché : s'il est servi depuis le
    // cache après un déploiement, le navigateur charge l'ancienne application.
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
  console.log(`Serving web build from ${webDistDir}`);
} else {
  console.log(`No web build at ${webDistDir} — API only (run the vite dev server separately).`);
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Yogella API listening on http://${HOST}:${PORT}`);
});

// Coolify stops containers with SIGTERM; close cleanly so in-flight requests finish.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
