import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { placeCards, type PlaceRoom, type Rect } from "./place";

const GAP = 24;
const HELD_GAP = 64;
const PAD = 16;

const rect: fc.Arbitrary<Rect> = fc.record({
  x: fc.integer({ min: 0, max: 1200 }),
  y: fc.integer({ min: 0, max: 900 }),
  w: fc.integer({ min: 40, max: 360 }),
  h: fc.integer({ min: 40, max: 300 }),
});
const size = fc.record({ w: fc.integer({ min: 60, max: 340 }), h: fc.integer({ min: 60, max: 280 }) });
const room: fc.Arbitrary<PlaceRoom> = fc
  .record({
    widgets: fc.array(rect, { maxLength: 8 }),
    view: fc.record({ x: fc.integer({ min: 0, max: 600 }), y: fc.integer({ min: 0, max: 600 }), w: fc.integer({ min: 200, max: 1400 }), h: fc.integer({ min: 200, max: 900 }) }),
    heldMask: fc.array(fc.boolean(), { maxLength: 8 }),
    pickSelected: fc.option(fc.nat(), { nil: undefined }),
    anchor: fc.option(fc.record({ x: fc.integer({ min: 0, max: 1500 }), y: fc.integer({ min: 0, max: 1200 }) }), { nil: undefined }),
  })
  .map(({ widgets, view, heldMask, pickSelected, anchor }) => {
    const ws = widgets.map((r, i) => ({ ...r, id: `w${i}` }));
    return {
      widgets: ws,
      view,
      held: new Set(ws.filter((_, i) => heldMask[i]).map((w) => w.id)),
      selected: pickSelected !== undefined && ws.length ? ws[pickSelected % ws.length].id : null,
      anchor,
    };
  });
const cards = fc.array(size, { minLength: 1, maxLength: 6 });

/** True when `a` and `b` are at least `gap` apart along some axis. */
const clear = (a: Rect, b: Rect, gap: number) =>
  a.x >= b.x + b.w + gap || b.x >= a.x + a.w + gap || a.y >= b.y + b.h + gap || b.y >= a.y + a.h + gap;

describe("placeCards properties", () => {
  it("returns one finite integer spot per card", () => {
    fc.assert(
      fc.property(cards, room, (cs, r) => {
        const spots = placeCards(cs, r);
        expect(spots).toHaveLength(cs.length);
        for (const s of spots) {
          expect(Number.isFinite(s.x) && Number.isFinite(s.y)).toBe(true);
          expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("placed cards never overlap each other or any widget, and keep GAP / HELD_GAP berths", () => {
    fc.assert(
      fc.property(cards, room, (cs, r) => {
        const spots = placeCards(cs, r);
        const placed = spots.map((s, i) => ({ ...s, ...cs[i] }));
        for (const [i, p] of placed.entries()) {
          for (const w of r.widgets) expect(clear(p, w, r.held?.has(w.id) ? HELD_GAP : GAP)).toBe(true);
          for (const q of placed.slice(i + 1)) expect(clear(p, q, GAP)).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("stays at or past the canvas origin plus padding", () => {
    fc.assert(
      fc.property(cards, room, (cs, r) => {
        for (const s of placeCards(cs, r)) {
          expect(s.x).toBeGreaterThanOrEqual(PAD);
          expect(s.y).toBeGreaterThanOrEqual(PAD);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("is deterministic", () => {
    fc.assert(fc.property(cards, room, (cs, r) => { expect(placeCards(cs, r)).toEqual(placeCards(cs, r)); }), { numRuns: 100 });
  });

  it("lands inside the view when a single small card meets an empty board", () => {
    fc.assert(
      fc.property(size, fc.integer({ min: 0, max: 300 }), (s, vx) => {
        fc.pre(s.w <= 700 && s.h <= 500);
        const view = { x: vx, y: 0, w: 800, h: 600 };
        const [p] = placeCards([s], { widgets: [], view });
        const c = { ...p, ...s };
        expect(c.x >= view.x && c.y >= view.y && c.x + c.w <= view.x + view.w && c.y + c.h <= view.y + view.h).toBe(true);
      }),
    );
  });

  it("no cards, no spots", () => {
    expect(placeCards([], { widgets: [], view: { x: 0, y: 0, w: 500, h: 500 } })).toEqual([]);
  });
});
