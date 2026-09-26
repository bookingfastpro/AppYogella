/**
 * Humeurs proposées sur l'accueil. La clé est stockée dans videos.moods ; le
 * libellé et l'icône vivent côté front (web/src/lib/moods.ts), avec les mêmes clés.
 */
export const MOOD_KEYS = [
  "stressee",
  "fatiguee",
  "manque-energie",
  "mal-au-dos",
  "envie-de-bouger",
  "besoin-de-ralentir",
  "mediter",
] as const;

export type MoodKey = (typeof MOOD_KEYS)[number];

export function isMoodKey(value: string): value is MoodKey {
  return (MOOD_KEYS as readonly string[]).includes(value);
}
