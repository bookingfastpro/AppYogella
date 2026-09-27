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

# Variables Supabase Auth : présence seulement, jamais la valeur. Une variable
# absente ici l'est au runtime — dans Coolify, vérifier qu'elle n'est pas
# cochée « Build Variable » uniquement, puis redéployer.
missing=""
echo "Variables Supabase :"
for name in SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY; do
  eval "value=\${$name}"
  if [ -n "$value" ]; then
    printf '  %-26s définie (%s caractères)\n' "$name" "${#value}"
  else
    printf '  %-26s ABSENTE\n' "$name"
    missing="$missing $name"
  fi
done
if [ -n "$missing" ]; then
  echo "Variables manquantes au démarrage :$missing" >&2
  echo "Coolify → Environment Variables : ajoutez-les (sans « Build Variable » seul), puis Redeploy." >&2
  exit 1
fi

# Supabase Auth et la base doivent appartenir au même projet : les profils
# référencent auth.users. Sinon la connexion réussit côté Auth puis échoue en
# base (erreur 500). Le projet se lit dans https://<ref>.supabase.co et dans
# l'utilisateur postgres.<ref> du pooler ; un domaine personnalisé n'est pas vérifié.
auth_ref=$(printf '%s' "$SUPABASE_URL" | sed -nE 's#^https?://([a-z0-9]+)\.supabase\.co.*#\1#p')
db_ref=$(printf '%s' "$DATABASE_URL" | sed -nE 's#^postgres(ql)?://postgres\.([a-z0-9]+):.*#\2#p')
echo "Projet Supabase : Auth=${auth_ref:-?} Base=${db_ref:-?}"
if [ -n "$auth_ref" ] && [ -n "$db_ref" ] && [ "$auth_ref" != "$db_ref" ]; then
  echo "SUPABASE_URL ($auth_ref) et DATABASE_URL ($db_ref) viennent de deux projets Supabase différents." >&2
  echo "Utilisez l'URL et les clés API du projet de la base (Project Settings → API Keys), puis Redeploy." >&2
  exit 1
fi

# Les migrations ne font que des ajouts au schéma Supabase existant ; les
# données (cours, programmes, comptes) vivent dans Supabase, sans seed.
echo "Application des migrations Prisma… (via DIRECT_URL)"
npx prisma migrate deploy

exec "$@"
