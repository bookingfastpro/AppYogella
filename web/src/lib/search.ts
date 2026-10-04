/** Recherche insensible à la casse et aux accents : « medit » trouve « Méditation ». */
export function matches(text: string, query: string) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return norm(text).includes(norm(query.trim()))
}
