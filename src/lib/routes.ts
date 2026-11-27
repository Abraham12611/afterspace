/** The space a bare URL opens — always shown with its explicit room slug. */
export const DEFAULT_SPACE_SLUG = "coven";

export function normalSpaceHash(slug: string) {
  return `#/space/${encodeURIComponent(slug)}`;
}

/** A room's own grimoire page ("what this space knows"): `#/space/<slug>/grimoire`. */
export function knowsHash(slug: string) {
  return `${normalSpaceHash(slug)}/grimoire`;
}

const GRIMOIRE_RE = /^#\/?space\/[^/?]+\/(grimoire|knows)\b/;
const LEGACY_KNOWS_RE = /^(#\/?space\/[^/?]+)\/knows\b/;

/** True when a hash is on the grimoire page (or its old `/knows` address). */
export function isGrimoireHash(hash: string = window.location.hash) {
  return GRIMOIRE_RE.test(hash);
}

/** Old `#/space/<slug>/knows` links keep working: rewrite them to `/grimoire` in place. */
export function redirectLegacyKnows() {
  const hash = window.location.hash;
  if (!LEGACY_KNOWS_RE.test(hash)) return;
  const next = hash.replace(LEGACY_KNOWS_RE, "$1/grimoire");
  window.history.replaceState(window.history.state, "", next);
}

/** The room a `#/space/<slug>[/page]` hash names, without the page. */
export function slugOfSpaceHash(rest: string) {
  return rest.split(/[/?]/)[0];
}

/** Which page of the room the hash is on: the board, or the grimoire. */
export function spacePageFromHash(): "board" | "knows" {
  return isGrimoireHash() ? "knows" : "board";
}

export function inviteUrlForSpace(slug: string) {
  return `${window.location.origin}${window.location.pathname}#/join/${encodeURIComponent(slug)}`;
}

/** About remembers the room you came from. A cold link returns to the
 *  coven at its explicit `#/space/coven` address. */
const LAST_SPACE_KEY = "ourspaces:last-space";

export function rememberSpaceSlug(slug: string) {
  try {
    window.sessionStorage.setItem(LAST_SPACE_KEY, slug);
  } catch {
    /* private mode — the default slug is a fine answer */
  }
}

export function lastSpaceSlug(): string {
  try {
    return window.sessionStorage.getItem(LAST_SPACE_KEY) || DEFAULT_SPACE_SLUG;
  } catch {
    return DEFAULT_SPACE_SLUG;
  }
}
