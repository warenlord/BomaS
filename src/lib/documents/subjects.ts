/** Matières proposées à l'import d'un document (programme gabonais, collège/lycée + supérieur). */
export const SUBJECTS = [
  "Mathématiques",
  "Français",
  "Anglais",
  "Histoire-Géographie",
  "SVT",
  "Physique-Chimie",
  "Philosophie",
  "Économie",
  "EPS",
  "Informatique",
  "Autre",
] as const;

export type Subject = (typeof SUBJECTS)[number];
