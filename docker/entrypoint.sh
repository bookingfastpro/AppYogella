#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL n'est pas défini — configurez la connexion Supabase." >&2
  exit 1
fi

# `prisma migrate deploy` passe par DIRECT_URL (pooler de sessions Supabase).
if [ -z "$DIRECT_URL" ]; then
  DIRECT_URL="$DATABASE_URL"
  export DIRECT_URL
fi

# Journalise la cible de chaque URL sans jamais révéler le mot de passe : une
# erreur d'authentification vient presque toujours d'un utilisateur tronqué
# (le pooler Supabase exige postgres.<project-ref>) ou d'un port erroné.
describe_url() {
  printf '  %-12s %s\n' "$1" "$(printf '%s' "$2" | sed -E 's#(://[^:]*):[^@]*@#\1:****@#')"
}
echo "Connexions configurées :"
describe_url "DATABASE_URL" "$DATABASE_URL"
describe_url "DIRECT_URL" "$DIRECT_URL"

# Les migrations ne font que des ajouts au schéma Supabase existant ; les
# données (cours, programmes, comptes) vivent dans Supabase, sans seed.
echo "Application des migrations Prisma… (via DIRECT_URL)"
npx prisma migrate deploy

exec "$@"
