/**
 * The pet (F4): pure rules. No React, no Convex, no clock, no network.
 *
 * Health comes only from what people really did. Every event adds its weight,
 * fading linearly to nothing over 72 h; the sum is clamped to 0-100. A "hatch"
 * event gives a new pet a few days of grace. "present" (a member showing up)
 * counts once per member, by that member's freshest visit.
 */

export type EventKind = "hatch" | "card" | "vote" | "rsvp" | "claim" | "split" | "checkin" | "letter" | "reply" | "present";
export type PetEvent = { kind: EventKind; at: number; by?: string };
export type PetState = "thriving" | "okay" | "hungry" | "fading" | "dead";

export const HOUR_MS = 3_600_000;
export const WINDOW_MS = 72 * HOUR_MS;
/** health 0 for this long and the pet dies */
export const DEAD_AFTER_MS = 24 * HOUR_MS;
/** distinct members who must each act within 24 h to revive a dead pet */
export const REVIVE_NEED = 3;
export const REVIVE_WINDOW_MS = 24 * HOUR_MS;
/** plans (closed polls, expired countdowns) go to the graveyard this long after they ended */
export const PLAN_GRAVE_AFTER_MS = 14 * 24 * HOUR_MS;

/** What one fresh event is worth. */
export const WEIGHTS: Record<EventKind, number> = {
  hatch: 45,
  card: 12,
  vote: 8,
  rsvp: 8,
  claim: 8,
  split: 8,
  checkin: 10,
  letter: 10,
  reply: 4,
  present: 8,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 1 when the event just happened, 0 at 72 h and older. An event "from the future" (clock skew) counts as just now. */
export function freshness(at: number, now: number): number {
  const age = Math.max(0, now - at);
  return clamp(1 - age / WINDOW_MS, 0, 1);
}

/** 0-100 from the events in the last 72 h. */
export function health(events: readonly PetEvent[], now: number): number {
  let sum = 0;
  const present = new Map<string, number>();
  for (const e of events) {
    const f = freshness(e.at, now);
    if (f <= 0) continue;
    if (e.kind === "present") {
      // one presence per member: the freshest visit
      const key = e.by ?? "?";
      present.set(key, Math.max(present.get(key) ?? 0, f));
    } else sum += WEIGHTS[e.kind] * f;
  }
  for (const f of present.values()) sum += WEIGHTS.present * f;
  return clamp(Math.round(sum), 0, 100);
}

/**
 * thriving 70-100, okay 40-69, hungry 15-39, fading 1-14. At 0 the pet is
 * still fading until it has been at 0 for 24 h (`zeroForMs`), then dead.
 */
export function stateOf(h: number, zeroForMs = 0): PetState {
  if (h >= 70) return "thriving";
  if (h >= 40) return "okay";
  if (h >= 15) return "hungry";
  if (h >= 1) return "fading";
  return zeroForMs >= DEAD_AFTER_MS ? "dead" : "fading";
}

/** Keep only what can still matter (inside the window), newest last, at most `cap`. */
export function trimEvents(events: readonly PetEvent[], now: number, cap = 300): PetEvent[] {
  const live = events.filter((e) => now - e.at < WINDOW_MS).sort((a, b) => a.at - b.at);
  return live.length > cap ? live.slice(live.length - cap) : live;
}

/** What each kind of help looks like, when the room has something to help with (topic) or nothing specific (generic). */
const HINTS: { kind: EventKind; topic?: (t: string) => string; generic: string }[] = [
  { kind: "vote", topic: (t) => `nobody's voted on ${t} yet`, generic: "nobody's voted on anything yet" },
  { kind: "rsvp", topic: (t) => `nobody's said if they're coming to ${t}`, generic: "nobody's said if they're coming" },
  { kind: "claim", topic: (t) => `nobody's claimed anything on ${t}`, generic: "nobody's claimed anything yet" },
  { kind: "checkin", topic: (t) => `nobody's checked in on ${t}`, generic: "nobody's checked in yet" },
  { kind: "card", generic: "nothing new on the page lately" },
  { kind: "reply", generic: "it's quiet in the threads" },
  { kind: "present", generic: "it's been a while since you were all here" },
];

/** The topics a room can give a hint about: the title of an open poll nobody voted on, and so on. */
export type HintTopics = Partial<Record<EventKind, string>>;

/**
 * One line about what would help: the first kind of activity missing from the
 * last 72 h. With `topics` given, vote/rsvp/claim/checkin hints are only for
 * things the room really has; without it every kind can be named. Null when
 * every kind happened recently.
 */
export function hint(events: readonly PetEvent[], now: number, topics?: HintTopics): string | null {
  const seen = new Set(events.filter((e) => freshness(e.at, now) > 0).map((e) => e.kind));
  for (const h of HINTS) {
    if (seen.has(h.kind)) continue;
    const t = topics?.[h.kind];
    if (h.topic) {
      if (topics && !t) continue;
      return t ? h.topic(t) : h.generic;
    }
    return h.generic;
  }
  return null;
}

/** Distinct members who did something real (not just showed up) since the pet died, within the last 24 h. */
export function reviveProgress(events: readonly PetEvent[], diedAt: number, now: number): number {
  const since = Math.max(diedAt, now - REVIVE_WINDOW_MS);
  const who = new Set<string>();
  for (const e of events) {
    if (e.kind === "hatch" || e.kind === "present" || !e.by) continue;
    if (e.at >= since && e.at <= now) who.add(e.by);
  }
  return Math.min(REVIVE_NEED, who.size);
}

const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
const ROMAN_TAIL = /\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/;

/** The name of the next generation: "wisp" -> "wisp ii" -> "wisp iii". */
export function reviveName(name: string, nextGeneration: number): string {
  const base = name.replace(ROMAN_TAIL, "").trim() || "wisp";
  return nextGeneration <= 1 ? base : `${base} ${ROMAN[nextGeneration] ?? nextGeneration}`;
}

/** "3 days", "5 hours", "just born". */
export function ageLabel(bornAt: number, now: number): string {
  const ms = Math.max(0, now - bornAt);
  const days = Math.floor(ms / (24 * HOUR_MS));
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / HOUR_MS);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return "just born";
}

/** Why it died, in the group's terms. */
export function causeOf(events: readonly PetEvent[], bornAt: number, diedAt: number): string {
  const last = events.filter((e) => e.kind !== "hatch" && e.kind !== "present").reduce((m, e) => Math.max(m, e.at), 0);
  const since = last > 0 ? last : bornAt;
  const days = Math.max(1, Math.round((diedAt - since) / (24 * HOUR_MS)));
  return last > 0 ? `nobody did anything for ${days} days` : `nobody came back after the first day`;
}

/** Canned epitaphs, used when the model is off, over its daily ceiling, or answers badly. */
export const CANNED_EPITAPHS: readonly string[] = [
  "it waited by the poll. nobody came.",
  "fed on plans, starved on follow-through.",
  "last seen haunting an unread thread.",
  "it believed in the group chat.",
  "gone, quietly, like the rsvp from jo.",
  "it was never invited. it just stayed.",
  "ghosted by the people it ghosted for.",
  "here lies a pet that outlived the plan.",
  "it said 'we should do this again.' we did not.",
  "died as it lived: unanswered.",
  "may the next one get a vote.",
  "it was thriving. then came tuesday.",
  "it ate every notification and still went hungry.",
  "somewhere a calendar invite is still pending.",
  "it kept the page warm for nobody.",
  "no flowers, only unread messages.",
  "it asked for one claim. just one.",
  "gone before the cabin was booked.",
  "it floated. it flickered. it faded.",
  "the group was busy. the group is always busy.",
];

/** A stable pick: the same seed always gives the same canned line. */
export function cannedEpitaph(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CANNED_EPITAPHS[h % CANNED_EPITAPHS.length];
}

/** Keep a model's one sentence, or null when it isn't usable. */
export function cleanEpitaph(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim().replace(/^["“']|["”']$/g, "").toLowerCase();
  if (s.length < 8 || s.length > 140) return null;
  return s;
}
