import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CANNED_EPITAPHS, DEAD_AFTER_MS, HOUR_MS, WINDOW_MS, cannedEpitaph, causeOf, cleanEpitaph, health, hint, reviveName, reviveProgress, stateOf, trimEvents,
  type EventKind, type PetEvent,
} from "./familiar";

const NOW = 1_800_000_000_000;
const kinds: EventKind[] = ["hatch", "card", "vote", "rsvp", "claim", "split", "checkin", "letter", "reply", "present"];
const event: fc.Arbitrary<PetEvent> = fc.record({
  kind: fc.constantFrom(...kinds),
  // from 5 days ago to 1 hour in the future (clock skew)
  at: fc.integer({ min: NOW - 5 * 24 * HOUR_MS, max: NOW + HOUR_MS }),
  by: fc.option(fc.constantFrom("a", "b", "c", "d"), { nil: undefined }),
});
const events = fc.array(event, { maxLength: 40 });

describe("health", () => {
  it("is always an integer 0-100", () => {
    fc.assert(fc.property(events, fc.integer({ min: NOW - WINDOW_MS, max: NOW + 10 * WINDOW_MS }), (es, now) => {
      const h = health(es, now);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(100);
    }));
  });

  it("adding an event never lowers it", () => {
    fc.assert(fc.property(events, event, (es, e) => {
      expect(health([...es, e], NOW)).toBeGreaterThanOrEqual(health(es, NOW));
    }));
  });

  it("with no new events it never rises as time advances", () => {
    fc.assert(fc.property(events, fc.integer({ min: 0, max: 4 * WINDOW_MS }), fc.integer({ min: 0, max: 4 * WINDOW_MS }), (es, a, b) => {
      const [t1, t2] = a <= b ? [a, b] : [b, a];
      expect(health(es, NOW + t2)).toBeLessThanOrEqual(health(es, NOW + t1));
    }));
  });

  it("is zero once everything is older than 72 h", () => {
    fc.assert(fc.property(events, (es) => {
      expect(health(es, NOW + WINDOW_MS + HOUR_MS + 1_000)).toBe(0);
    }));
  });

  it("does not depend on the order of events", () => {
    fc.assert(fc.property(events, (es) => {
      expect(health([...es].reverse(), NOW)).toBe(health(es, NOW));
    }));
  });

  it("counts a member's presence once", () => {
    const visits = (n: number): PetEvent[] => Array.from({ length: n }, () => ({ kind: "present", at: NOW, by: "a" }));
    expect(health(visits(5), NOW)).toBe(health(visits(1), NOW));
  });

  it("a fresh vote is worth its weight", () => {
    expect(health([{ kind: "vote", at: NOW, by: "a" }], NOW)).toBe(8);
    expect(health([{ kind: "vote", at: NOW - WINDOW_MS / 2, by: "a" }], NOW)).toBe(4);
  });
});

describe("stateOf", () => {
  it("matches the thresholds for every health", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 0, max: 10 * DEAD_AFTER_MS }), (h, zero) => {
      const s = stateOf(h, zero);
      if (h >= 70) expect(s).toBe("thriving");
      else if (h >= 40) expect(s).toBe("okay");
      else if (h >= 15) expect(s).toBe("hungry");
      else expect(s).toBe("fading");
    }));
  });

  it("is dead only after 24 h at zero", () => {
    expect(stateOf(0, 0)).toBe("fading");
    expect(stateOf(0, DEAD_AFTER_MS - 1)).toBe("fading");
    expect(stateOf(0, DEAD_AFTER_MS)).toBe("dead");
  });
});

describe("hint", () => {
  it("names the topic when the room has one", () => {
    expect(hint([], NOW, { vote: "dinner" })).toBe("nobody's voted on dinner yet");
  });
  it("skips things the room doesn't have", () => {
    expect(hint([], NOW, {})).toBe("nothing new on the page lately");
  });
  it("is null when everything happened lately", () => {
    const all = (["vote", "rsvp", "claim", "checkin", "card", "reply", "present"] as const).map((kind) => ({ kind, at: NOW, by: "a" }));
    expect(hint(all, NOW)).toBeNull();
  });
  it("never suggests something that just happened", () => {
    fc.assert(fc.property(events, (es) => {
      const h = hint(es, NOW);
      if (h?.startsWith("nobody's voted")) expect(es.some((e) => e.kind === "vote" && e.at > NOW - WINDOW_MS)).toBe(false);
    }));
  });
});

describe("revive", () => {
  const acts = (by: string[], at: number): PetEvent[] => by.map((b) => ({ kind: "card", at, by: b }));
  it("counts distinct members, capped at 3", () => {
    expect(reviveProgress(acts(["a", "a", "b"], NOW - HOUR_MS), NOW - 2 * HOUR_MS, NOW)).toBe(2);
    expect(reviveProgress(acts(["a", "b", "c", "d"], NOW - HOUR_MS), NOW - 2 * HOUR_MS, NOW)).toBe(3);
  });
  it("ignores what happened before death or over 24 h ago, and mere presence", () => {
    expect(reviveProgress(acts(["a"], NOW - 3 * HOUR_MS), NOW - 2 * HOUR_MS, NOW)).toBe(0);
    expect(reviveProgress(acts(["a"], NOW - 30 * HOUR_MS), NOW - 40 * HOUR_MS, NOW)).toBe(0);
    expect(reviveProgress([{ kind: "present", at: NOW, by: "a" }], NOW - HOUR_MS, NOW)).toBe(0);
  });
  it("never exceeds 3 and never goes below 0", () => {
    fc.assert(fc.property(events, fc.integer({ min: NOW - 3 * 24 * HOUR_MS, max: NOW }), (es, died) => {
      const n = reviveProgress(es, died, NOW);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(3);
    }));
  });
  it("names the next generation", () => {
    expect(reviveName("wisp", 2)).toBe("wisp ii");
    expect(reviveName("wisp ii", 3)).toBe("wisp iii");
    expect(reviveName("wisp iii", 4)).toBe("wisp iv");
    expect(reviveName("", 2)).toBe("wisp ii");
  });
});

describe("epitaphs", () => {
  it("has 20 canned lines and picks one stably", () => {
    expect(CANNED_EPITAPHS).toHaveLength(20);
    fc.assert(fc.property(fc.string(), (seed) => {
      expect(CANNED_EPITAPHS).toContain(cannedEpitaph(seed));
      expect(cannedEpitaph(seed)).toBe(cannedEpitaph(seed));
    }));
  });
  it("keeps usable model lines only", () => {
    expect(cleanEpitaph('"It Waited."')).toBe("it waited.");
    expect(cleanEpitaph("no")).toBeNull();
    expect(cleanEpitaph(42)).toBeNull();
    expect(cleanEpitaph("x".repeat(200))).toBeNull();
  });
  it("says why", () => {
    expect(causeOf([], NOW - 5 * 24 * HOUR_MS, NOW)).toBe("nobody came back after the first day");
    expect(causeOf([{ kind: "vote", at: NOW - 4 * 24 * HOUR_MS, by: "a" }], 0, NOW)).toBe("nobody did anything for 4 days");
  });
});

describe("trimEvents", () => {
  it("drops what left the window and caps the length", () => {
    fc.assert(fc.property(events, (es) => {
      const t = trimEvents(es, NOW, 10);
      expect(t.length).toBeLessThanOrEqual(10);
      expect(t.every((e) => NOW - e.at < WINDOW_MS)).toBe(true);
    }));
  });
});
