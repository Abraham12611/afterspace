/**
 * Faces are content, not identity logic. Keeping the catalog in one place lets
 * seeded people and named visitor personas share the same visual language.
 */
/** Placeholder looks (public/avatars/look-01..12.png); our own art replaces them later. */
export const AVATAR_CATALOG: Record<string, string> = {
  wren: "/avatars/look-01.png",
  theo: "/avatars/look-02.png",
  priya: "/avatars/look-03.png",
  dante: "/avatars/look-04.png",
  juno: "/avatars/look-05.png",
  kai: "/avatars/look-06.png",
  momo: "/avatars/look-07.png",
  pico: "/avatars/look-08.png",
  ziggy: "/avatars/look-09.png",
  clover: "/avatars/look-10.png",
  pepper: "/avatars/look-11.png",
  kiwi: "/avatars/look-12.png",
};

export function getAvatarSrc(name: string): string | undefined {
  return AVATAR_CATALOG[name.trim().toLowerCase()];
}

export const VISITOR_AVATAR_NAMES = [
  "juno",
  "momo",
  "pico",
  "wren",
  "ziggy",
  "clover",
  "pepper",
  "kiwi",
] as const;
