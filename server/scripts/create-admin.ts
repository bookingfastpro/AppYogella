/**
 * Donne (ou retire) les droits d'administration à un compte existant.
 *
 *   npm run create-admin -- --email=x@y.fr
 *   npm run create-admin -- --email=x@y.fr --revoke
 *
 * Les comptes et mots de passe sont gérés par Supabase Auth : la personne crée
 * d'abord son compte depuis l'application (ou le dashboard Supabase), puis ce
 * script la promeut. Avec --subscription, un abonnement annuel manuel lui est
 * aussi attribué pour accéder au contenu premium.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) {
    console.error("Usage : npm run create-admin -- --email=x@y.fr [--revoke] [--subscription]");
    process.exitCode = 1;
    return;
  }

  const profile = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!profile) {
    console.error(`Aucun compte pour ${email}. Créez-le d'abord depuis l'application (écran d'inscription).`);
    process.exitCode = 1;
    return;
  }

  const isAdmin = !flag("revoke");
  await prisma.profile.update({ where: { id: profile.id }, data: { isAdmin, active: true } });

  if (flag("subscription")) {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    const data = { status: "active", plan: "ANNUAL", currentPeriodEnd, isManual: true };
    await prisma.subscription.upsert({
      where: { userId: profile.id },
      create: { userId: profile.id, stripeCustomerId: `manual_${profile.id}`, ...data },
      update: data,
    });
  }

  console.log(`${isAdmin ? "Droits administrateur accordés à" : "Droits administrateur retirés à"} ${profile.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
