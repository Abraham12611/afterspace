/**
 * The spirit board (F5): pure rules. No React, no Convex, no clock, no network.
 *
 * Everyone holding the planchette points somewhere on the board (coordinates
 * 0..1, board-local). The planchette sits at the mean of those points. When it
 * stays on one answer for 3 s with 2+ hands on it, that answer locks. The
 * server runs these same functions on presence rows (convex/spiritBoard.ts),
 * so the client can show the dwell but never decides it.
 */

export type Pt = { x: number; y: number };
/** One answer's spot on the board: its centre and how far from it still counts as "on" it. */
export type Spot = Pt & { r: number };

export const DWELL_MS = 3_000;
export const MIN_HANDS = 2;
/** a dwell survives one missed sample this long (a hand's last report is a beat late) */
export const GRACE_MS = 1_500;
/** a sample further than this from the last one starts the dwell over */
export const GAP_MS = 2_500;
/** a hand's pointer older than this is not on the board any more */
export const FRESH_MS = 2_000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Answers sit on an arc across the top of a square board (a half circle), left to right. */
export function arcLayout(count: number): Spot[] {
  const n = Math.max(1, Math.floor(count));
  const cx = 0.5;
  const cy = 0.66;
  const R = 0.36;
  // keep neighbours from overlapping: spots may not be wider than the gap between centres
  const r = Math.min(0.14, 0.45 * ((Math.PI * R) / n));
  return Array.from({ length: n }, (_, i) => {
    const theta = Math.PI - (Math.PI * (i + 0.5)) / n;
    return { x: cx + R * Math.cos(theta), y: cy - R * Math.sin(theta), r };
  });
}

/** The mean of the holders' pointers, or null with nobody holding. Each point is clamped onto the board first. */
export function mean(points: readonly Pt[]): Pt | null {
  if (!points.length) return null;
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += clamp01(p.x);
    y += clamp01(p.y);
  }
  return { x: x / points.length, y: y / points.length };
}

/** The index of the answer the position rests on (nearest centre within its radius), or null. */
export function answerUnder(pos: Pt | null, layout: readonly Spot[]): number | null {
  if (!pos) return null;
  let best: number | null = null;
  let bestD = Infinity;
  layout.forEach((s, i) => {
    const d = Math.hypot(pos.x - s.x, pos.y - s.y);
    if (d <= s.r && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** A dwell in progress: which answer, since when, and when it was last confirmed. */
export type Dwell = { answer: number; since: number; seen: number };
export type Sample = { answer: number | null; hands: number; at: number };

/**
 * Advance a dwell by one sample. It starts when 2+ hands are on one answer,
 * continues while they stay on it, and locks after DWELL_MS. Moving off an
 * answer (or a hand letting go) resets it, except for one short missed sample
 * (GRACE_MS). One hand never starts it.
 */
export function step(dwell: Dwell | null, s: Sample): { dwell: Dwell | null; locked: boolean } {
  const valid = s.hands >= MIN_HANDS && s.answer !== null;
  if (!valid) {
    // a hand's last report a beat late (still on the same answer): keep the dwell, but never lock on it
    if (dwell && s.answer === dwell.answer && s.at - dwell.seen <= GRACE_MS) return { dwell, locked: false };
    return { dwell: null, locked: false };
  }
  const answer = s.answer as number;
  const next: Dwell = dwell && dwell.answer === answer && s.at - dwell.seen <= GAP_MS ? { answer, since: dwell.since, seen: s.at } : { answer, since: s.at, seen: s.at };
  return { dwell: next, locked: s.at - next.since >= DWELL_MS };
}

/** 0..1 of the way to a lock, for the glow. */
export function dwellProgress(dwell: Dwell | null, now: number): number {
  if (!dwell) return 0;
  return Math.min(1, Math.max(0, (now - dwell.since) / DWELL_MS));
}
