/**
 * Extraction de l'identifiant d'une vidéo YouTube.
 *
 * On stocke l'identifiant à 11 caractères plutôt que l'URL collée par
 * l'administratrice : les formes acceptées sont nombreuses (watch, youtu.be,
 * embed, shorts, live) et souvent alourdies de paramètres de suivi.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw; // identifiant déjà nu

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return segments[0] && ID.test(segments[0]) ? segments[0] : null;
  }
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }
  if (segments[0] === "watch") {
    const v = url.searchParams.get("v");
    return v && ID.test(v) ? v : null;
  }
  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  if (["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) {
    return segments[1] && ID.test(segments[1]) ? segments[1] : null;
  }
  const v = url.searchParams.get("v");
  return v && ID.test(v) ? v : null;
}

/**
 * Miniature par défaut d'une vidéo YouTube (toujours disponible).
 * mqdefault est en 16:9 ; hqdefault/sddefault sont en 4:3 avec des bandes
 * noires en haut et en bas, visibles dans les vignettes.
 */
export function youtubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

/** URL d'intégration, sans cookies de suivi tant que la vidéo n'est pas lue. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
