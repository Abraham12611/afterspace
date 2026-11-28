import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DWELL_MS, FRESH_MS, GAP_MS, GRACE_MS, answerUnder, arcLayout, dwellProgress, mean, step, type Dwell, type Pt, type Sample } from "./spiritBoard";

const pt = fc.record({ x: fc.double({ min: -0.5, max: 1.5, noNaN: true }), y: fc.double({ min: -0.5, max: 1.5, noNaN: true }) });
const points = fc.array(pt, { minLength: 1, maxLength: 8 });

describe("mean", () => {
  it("is null with no hands", () => expect(mean([])).toBeNull());

  it("lands inside the board and inside the hands' bounding box", () => {
    fc.assert(fc.property(points, (ps) => {
      const m = mean(ps)!;
      const cl = (n: number) => Math.min(1, Math.max(0, n));
      const xs = ps.map((p) => cl(p.x));
      const ys = ps.map((p) => cl(p.y));
      expect(m.x).toBeGreaterThanOrEqual(Math.min(...xs) - 1e-9);
      expect(m.x).toBeLessThanOrEqual(Math.max(...xs) + 1e-9);
      expect(m.y).toBeGreaterThanOrEqual(Math.min(...ys) - 1e-9);
      expect(m.y).toBeLessThanOrEqual(Math.max(...ys) + 1e-9);
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(1);
    }));
  });

  it("does not depend on who is listed first", () => {
    fc.assert(fc.property(points, (ps) => {
      const a = mean(ps)!;
      const b = mean([...ps].reverse())!;
      expect(a.x).toBeCloseTo(b.x, 9);
      expect(a.y).toBeCloseTo(b.y, 9);
    }));
  });

  it("one hand is the planchette", () => {
    expect(mean([{ x: 0.25, y: 0.75 }])).toEqual({ x: 0.25, y: 0.75 });
  });

  it("two hands pull to the middle", () => {
    expect(mean([{ x: 0, y: 0 }, { x: 1, y: 0.5 }])).toEqual({ x: 0.5, y: 0.25 });
  });
});

describe("arcLayout + answerUnder", () => {
  it("puts every answer on the board with spots that don't overlap", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 6 }), (n) => {
      const spots = arcLayout(n);
      expect(spots).toHaveLength(n);
      for (const s of spots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(1);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(1);
      }
      for (let i = 1; i < n; i++) {
        const d = Math.hypot(spots[i].x - spots[i - 1].x, spots[i].y - spots[i - 1].y);
        expect(d).toBeGreaterThanOrEqual(spots[i].r + spots[i - 1].r - 1e-9);
      }
    }));
  });

  it("each answer's own centre is under that answer", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 6 }), (n) => {
      const spots = arcLayout(n);
      spots.forEach((s, i) => expect(answerUnder(s, spots)).toBe(i));
    }));
  });

  it("answers at most one index, and only when the position is inside that spot", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 6 }), fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0, max: 1, noNaN: true }) }), (n, p) => {
      const spots = arcLayout(n);
      const a = answerUnder(p, spots);
      if (a === null) expect(spots.every((s) => Math.hypot(p.x - s.x, p.y - s.y) > s.r)).toBe(true);
      else expect(Math.hypot(p.x - spots[a].x, p.y - spots[a].y)).toBeLessThanOrEqual(spots[a].r);
    }));
  });

  it("no position, no answer", () => expect(answerUnder(null, arcLayout(3))).toBeNull());
});

/** Replay a run of samples through `step`. */
function run(samples: Sample[]) {
  let dwell: Dwell | null = null;
  const lockedAt: number[] = [];
  for (const s of samples) {
    const r = step(dwell, s);
    dwell = r.dwell;
    if (r.locked) lockedAt.push(s.at);
  }
  return { dwell, lockedAt };
}

const samples = fc
  .array(fc.record({ gap: fc.integer({ min: 100, max: 1_200 }), answer: fc.option(fc.integer({ min: 0, max: 2 }), { nil: null }), hands: fc.integer({ min: 0, max: 3 }) }), { maxLength: 40 })
  .map((rows) => {
    let at = 1_000_000;
    return rows.map((r): Sample => ({ at: (at += r.gap), answer: r.answer, hands: r.hands }));
  });

describe("dwell", () => {
  it("locks with 2 hands resting 3 s on one answer", () => {
    const at = (t: number): Sample => ({ at: 1000 + t, answer: 1, hands: 2 });
    const { lockedAt } = run([at(0), at(1000), at(2000), at(3000)]);
    expect(lockedAt).toEqual([4000]);
  });

  it("does not lock just under 3 s", () => {
    const at = (t: number): Sample => ({ at: t, answer: 1, hands: 2 });
    expect(run([at(0), at(1000), at(2000), at(DWELL_MS - 1)]).lockedAt).toEqual([]);
  });

  it("never locks with one hand, however long", () => {
    const one = Array.from({ length: 30 }, (_, i): Sample => ({ at: i * 500, answer: 0, hands: 1 }));
    expect(run(one).lockedAt).toEqual([]);
  });

  it("moving off resets the clock", () => {
    const rows: Sample[] = [
      { at: 0, answer: 0, hands: 2 }, { at: 1000, answer: 0, hands: 2 }, { at: 2000, answer: 0, hands: 2 },
      { at: 2500, answer: null, hands: 2 }, // slid off
      { at: 3000, answer: 0, hands: 2 }, { at: 4000, answer: 0, hands: 2 }, { at: 5000, answer: 0, hands: 2 },
    ];
    expect(run(rows).lockedAt).toEqual([]);
    expect(run([...rows, { at: 6000, answer: 0, hands: 2 }]).lockedAt).toEqual([6000]);
  });

  it("switching answers restarts it", () => {
    const rows: Sample[] = [{ at: 0, answer: 0, hands: 2 }, { at: 2000, answer: 0, hands: 2 }, { at: 2900, answer: 1, hands: 2 }, { at: 3500, answer: 1, hands: 2 }];
    expect(run(rows).lockedAt).toEqual([]);
  });

  it("a long silence restarts it", () => {
    const rows: Sample[] = [{ at: 0, answer: 0, hands: 2 }, { at: 1000, answer: 0, hands: 2 }, { at: 1000 + GAP_MS + 1, answer: 0, hands: 2 }, { at: 4000, answer: 0, hands: 2 }];
    expect(run(rows).lockedAt).toEqual([]);
  });

  it("any lock has 2+ hands in its own sample and 3 s of unbroken samples behind it", () => {
    fc.assert(fc.property(samples, (rows) => {
      let dwell: Dwell | null = null;
      for (const s of rows) {
        const r = step(dwell, s);
        if (r.locked) {
          expect(s.hands).toBeGreaterThanOrEqual(2);
          expect(s.answer).not.toBeNull();
          expect(r.dwell!.answer).toBe(s.answer);
          expect(s.at - r.dwell!.since).toBeGreaterThanOrEqual(DWELL_MS);
        }
        dwell = r.dwell;
      }
    }));
  });

  it("a run with one hand throughout never locks", () => {
    fc.assert(fc.property(samples, (rows) => {
      expect(run(rows.map((s) => ({ ...s, hands: Math.min(1, s.hands) }))).lockedAt).toEqual([]);
    }));
  });

  it("a hand that lapses within the grace keeps the dwell but cannot lock it", () => {
    const rows: Sample[] = [{ at: 0, answer: 0, hands: 2 }, { at: 1000, answer: 0, hands: 2 }, { at: 1000 + GRACE_MS, answer: 0, hands: 1 }];
    const r = run(rows);
    expect(r.lockedAt).toEqual([]);
    expect(r.dwell?.since).toBe(0);
  });

  it("freshness window is a couple of seconds", () => {
    expect(FRESH_MS).toBeGreaterThan(GRACE_MS);
  });

  it("progress goes 0 to 1", () => {
    const d: Dwell = { answer: 0, since: 1000, seen: 1000 };
    expect(dwellProgress(null, 5000)).toBe(0);
    expect(dwellProgress(d, 1000)).toBe(0);
    expect(dwellProgress(d, 2500)).toBeCloseTo(0.5);
    expect(dwellProgress(d, 99_000)).toBe(1);
  });
});

describe("types", () => {
  it("Pt is plain", () => {
    const p: Pt = { x: 0, y: 1 };
    expect(p).toEqual({ x: 0, y: 1 });
  });
});
