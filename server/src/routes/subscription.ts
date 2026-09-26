import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeMe } from "../lib/serialize.js";

export const subscriptionRouter = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

/** Les abonnements saisis à la main par l'admin n'ont pas de vrai client Stripe. */
export function manualCustomerId(userId: string) {
  return `manual_${userId}`;
}

subscriptionRouter.get("/subscription", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  res.json({ subscription: serializeMe(profile!).subscription });
});

const checkoutSchema = z.object({ plan: z.enum(["MONTHLY", "ANNUAL"]) });

subscriptionRouter.post("/subscription/checkout", requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({
      error:
        "La facturation Stripe n'est pas configurée sur ce serveur (STRIPE_SECRET_KEY manquant).",
    });
  }
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Formule invalide" });

  const plan = await prisma.plan.findUnique({ where: { key: parsed.data.plan } });
  if (!plan || !plan.active) return res.status(400).json({ error: "Formule indisponible" });

  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  if (!profile) return res.status(401).json({ error: "Authentification requise" });

  let customerId = profile.subscription?.stripeCustomerId;
  if (!customerId || customerId.startsWith("manual_")) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.fullName ?? undefined,
      metadata: { userId: profile.id },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { userId: profile.id },
      create: { userId: profile.id, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });
  }

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const trialDays = settings?.trialDays ?? 0;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = plan.stripePriceId
    ? { price: plan.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: "eur",
          unit_amount: plan.priceCents,
          recurring: { interval: plan.key === "ANNUAL" ? "year" : "month" },
          product_data: { name: `Yogella — ${plan.label}` },
        },
        quantity: 1,
      };

  const webOrigin = publicOrigin();
  const metadata = { userId: profile.id, plan: plan.key };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [lineItem],
    // Les métadonnées doivent aussi vivre sur l'abonnement : ce sont elles que
    // lisent les événements customer.subscription.updated/deleted (résiliation).
    subscription_data: { metadata, ...(trialDays > 0 ? { trial_period_days: trialDays } : {}) },
    success_url: `${webOrigin}/profil?checkout=success`,
    cancel_url: `${webOrigin}/abonnement?checkout=cancelled`,
    metadata,
  });

  res.json({ url: session.url });
});

/** Premier domaine de WEB_ORIGIN : c'est l'URL de retour après Stripe. */
function publicOrigin() {
  return (process.env.WEB_ORIGIN || "http://localhost:5173").split(",")[0].trim();
}

subscriptionRouter.post("/subscription/portal", requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: "La facturation Stripe n'est pas configurée." });
  }
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } });
  if (!sub?.stripeCustomerId || sub.stripeCustomerId.startsWith("manual_")) {
    return res.status(400).json({ error: "Aucun compte de facturation associé" });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${publicOrigin()}/profil`,
  });
  res.json({ url: session.url });
});

// Raw-body webhook route — mounted separately in index.ts before json() middleware.
export async function stripeWebhookHandler(req: import("express").Request, res: import("express").Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(503).end();

  let event: Stripe.Event;
  try {
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed`);
  }

  // Stripe peut renvoyer un même événement : stripe_events sert de journal.
  // L'événement n'y est inscrit qu'une fois traité, pour qu'un échec soit
  // retenté par Stripe au lieu d'être ignoré.
  const seen = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.stripe_events WHERE id = ${event.id}`;
  if (seen.length) return res.json({ received: true, duplicate: true });

  async function upsertFromStripeSubscription(stripeSub: Stripe.Subscription) {
    const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer.id;
    // Repli sur le client Stripe pour les abonnements créés avant que les
    // métadonnées ne soient posées sur l'abonnement lui-même.
    const userId =
      stripeSub.metadata?.userId ??
      (await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } }))?.userId;
    if (!userId) return;

    const planKey = stripeSub.metadata?.plan === "MONTHLY" || stripeSub.metadata?.plan === "ANNUAL"
      ? stripeSub.metadata.plan
      : undefined;
    const item = stripeSub.items.data[0];
    const data = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      ...(planKey ? { plan: planKey } : {}),
      priceId: item?.price.id ?? null,
      currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
      trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      isManual: false,
    };
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && typeof session.subscription === "string") {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        stripeSub.metadata = { ...session.metadata, ...stripeSub.metadata };
        await upsertFromStripeSubscription(stripeSub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertFromStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  await prisma.$executeRaw`
    INSERT INTO public.stripe_events (id, type) VALUES (${event.id}, ${event.type})
    ON CONFLICT (id) DO NOTHING`;
  res.json({ received: true });
}
