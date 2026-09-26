/**
 * Slugs des cours et programmes : colonnes uniques et obligatoires du schéma
 * Supabase. Dérivés du titre, suffixés (-2, -3…) en cas de collision.
 */
export function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return base || "sans-titre";
}

export async function uniqueSlug(title: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await exists(slug); n++) slug = `${base}-${n}`;
  return slug;
}
