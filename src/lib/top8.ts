/**
 * Top 8 (F2): the members a viewer interacted with most in the last 7 days.
 * Pure: no clock, no Convex, no React. The caller gathers `interactions` and passes `now`.
 */

export type InteractionKind = "poll" | "rsvp" | "split" | "thread" | "letter";

/** One shared thing between the viewer and another member. */
export type Interaction = { memberId: string; kind: InteractionKind; at: number };

export type Top8Member = { id: string; name: string };

export type Top8Entry = {
  id: string;
  name: string;
  score: number;
  /** newest counted interaction, 0 when there is none */
  lastAt: number;
  counts: Partial<Record<InteractionKind, number>>;
};

export const TOP8_SIZE = 8;
export const TOP8_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const INTERACTION_WEIGHTS: Record<InteractionKind, number> = {
  poll: 1,
  rsvp: 2,
  split: 2,
  thread: 1,
  letter: 3,
};

/** Every member except the viewer, best first. `top8` is the first eight of this. */
export function rankMembers(
  viewerId: string,
  interactions: readonly Interaction[],
  now: number,
  members: readonly Top8Member[],
): Top8Entry[] {
  const byId = new Map<string, Top8Entry>();
  for (const member of members) {
    if (member.id === viewerId || byId.has(member.id)) continue;
    byId.set(member.id, { id: member.id, name: member.name, score: 0, lastAt: 0, counts: {} });
  }
  for (const item of interactions) {
    if (item.at > now || item.at < now - TOP8_WINDOW_MS) continue;
    const entry = byId.get(item.memberId);
    if (!entry) continue;
    entry.score += INTERACTION_WEIGHTS[item.kind];
    entry.lastAt = Math.max(entry.lastAt, item.at);
    entry.counts[item.kind] = (entry.counts[item.kind] ?? 0) + 1;
  }
  return [...byId.values()].sort(
    (a, b) => b.score - a.score || b.lastAt - a.lastAt || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

export function top8(
  viewerId: string,
  interactions: readonly Interaction[],
  now: number,
  members: readonly Top8Member[],
): Top8Entry[] {
  return rankMembers(viewerId, interactions, now, members).slice(0, TOP8_SIZE);
}

const PHRASES: Record<InteractionKind, (n: number) => string> = {
  poll: (n) => (n === 1 ? "1 poll together" : `${n} polls together`),
  rsvp: (n) => (n === 1 ? "1 rsvp together" : `${n} rsvps together`),
  split: (n) => (n === 1 ? "split 1 expense" : `split ${n} expenses`),
  thread: (n) => (n === 1 ? "1 thread together" : `${n} threads together`),
  letter: (n) => (n === 1 ? "1 letter" : `${n} letters`),
};

/** "3 polls together · 1 rsvp together": the two heaviest reasons, or a quiet line. */
export function whyLine(counts: Partial<Record<InteractionKind, number>>): string {
  const parts = (Object.keys(PHRASES) as InteractionKind[])
    .filter((kind) => (counts[kind] ?? 0) > 0)
    .sort((a, b) => (counts[b]! * INTERACTION_WEIGHTS[b]) - (counts[a]! * INTERACTION_WEIGHTS[a]))
    .slice(0, 2)
    .map((kind) => PHRASES[kind](counts[kind]!));
  return parts.length ? parts.join(" · ") : "haven't crossed paths lately";
}
