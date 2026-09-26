import type { Course, Universe } from "@prisma/client";
import { youtubeThumbnail, youtubeEmbedUrl } from "./youtube.js";

export type CourseWithUniverse = Course & { universe: Universe };

/** À inclure dans toute requête dont le résultat passe par serializeCourse. */
export const withUniverse = { universe: true } as const;

/** Seuls les cours dont la date de publication est passée sont visibles. */
export function publishedWhere() {
  return { publishedAt: { lte: new Date() } };
}

export function durationMin(course: Pick<Course, "durationSeconds">) {
  return Math.max(1, Math.round(course.durationSeconds / 60));
}

export function serializeCourse(
  course: CourseWithUniverse,
  hasAccess: boolean,
  opts: { includeMedia?: boolean } = {}
) {
  const locked = course.premium && !hasAccess;
  const includeMedia = opts.includeMedia ?? false;
  const minutes = durationMin(course);
  return {
    id: course.id,
    title: course.title,
    kind: course.kind as "COURSE" | "ARTICLE",
    universe: course.universe.label,
    category: course.category,
    moods: course.moods,
    durationMin: minutes,
    meta: `${minutes} min`,
    premium: course.premium,
    locked,
    // Vignette explicite si elle existe, sinon celle de YouTube — c'est ce qui
    // permet à l'admin de « laisser l'image de YouTube » sans rien téléverser.
    thumbnailUrl: course.thumbnailUrl ?? (course.youtubeId ? youtubeThumbnail(course.youtubeId) : null),
    authorName: course.authorName || null,
    authorRole: course.authorRole,
    ...(includeMedia && !locked
      ? {
          videoUrl: course.videoUrl,
          youtubeId: course.youtubeId,
          youtubeEmbedUrl: course.youtubeId ? youtubeEmbedUrl(course.youtubeId) : null,
          body: course.body || null,
        }
      : { videoUrl: null, youtubeId: null, youtubeEmbedUrl: null, body: null }),
  };
}
