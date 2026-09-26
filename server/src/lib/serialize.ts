import type { Profile, Subscription } from "@prisma/client";
import { displayName, isSubscriptionActive } from "../middleware/auth.js";

type ProfileWithSub = Profile & { subscription: Subscription | null };

/** Statut Stripe → les quatre états que connaît le front. */
export function subscriptionState(status: string | null | undefined): "NONE" | "TRIALING" | "ACTIVE" | "CANCELED" {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (!status || status === "incomplete") return "NONE";
  return "CANCELED";
}

export function serializeMe(profile: ProfileWithSub) {
  const sub = profile.subscription;
  const name = displayName(profile);
  return {
    id: profile.id,
    name,
    email: profile.email,
    initial: name.slice(0, 1).toUpperCase(),
    isAdmin: profile.isAdmin,
    createdAt: profile.createdAt,
    hasAccess: isSubscriptionActive(sub?.status),
    subscription: {
      plan: (sub?.plan as "MONTHLY" | "ANNUAL" | null | undefined) ?? null,
      status: subscriptionState(sub?.status),
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      trialEnd: sub?.trialEnd ?? null,
    },
  };
}
