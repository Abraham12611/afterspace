import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CASES, rightOfWay, type Hand, type Lease, type Write } from "./rightOfWay";

const ids = ["a", "b", "c", "d"] as const;
const person: fc.Arbitrary<Hand> = fc.record({ kind: fc.constant("person" as const), id: fc.constantFrom(...ids), name: fc.constantFrom("A", "B", "C", "D") });
const space: fc.Arbitrary<Hand> = fc.record({ kind: fc.constant("space" as const), asker: fc.option(fc.constantFrom(...ids), { nil: undefined }) });
const hand: fc.Arbitrary<Hand> = fc.oneof(person, space);
const thing = fc.constantFrom("t1", "t2", "t3", "t4");
const lease: fc.Arbitrary<Lease> = fc.record({ thing, by: hand, kind: fc.constantFrom<Lease["kind"]>("drag", "type", "vote", "piece") });
/** One lease per thing, like the real lease table. */
const leases = fc.array(lease, { maxLength: 6 }).map((ls) => ls.filter((l, i) => ls.findIndex((m) => m.thing === l.thing) === i));
const choice = fc.record({
  stake: fc.constant("s"),
  people: fc.array(fc.record({ id: fc.option(fc.constantFrom(...ids), { nil: undefined }), name: fc.constantFrom("A", "B", "C", "D") }), { maxLength: 3 }),
});
const write: fc.Arbitrary<Write> = fc.record(
  {
    thing: fc.option(thing, { nil: undefined }),
    by: hand,
    spot: fc.array(thing, { maxLength: 3 }),
    choice: fc.option(choice, { nil: undefined }),
    refused: fc.option(fc.constant("no"), { nil: undefined }),
    finishes: fc.boolean(),
  },
  { requiredKeys: ["by"] },
);

const idOf = (h: Hand) => (h.kind === "person" ? h.id : h.asker);

describe("rightOfWay CASES table", () => {
  it.each(CASES.map((c) => [`${c.n} ${c.name}`, c] as const))("%s", (_n, c) => {
    expect(rightOfWay(c.write, c.leases).kind).toBe(c.want);
  });
});

describe("rightOfWay properties", () => {
  it("a write to a card held by another person never goes", () => {
    fc.assert(
      fc.property(write, leases, (w, ls) => {
        fc.pre(w.thing !== undefined);
        const hold = ls.find((l) => l.thing === w.thing);
        fc.pre(!!hold && hold.by.kind === "person" && idOf(w.by) !== hold.by.id);
        expect(rightOfWay(w, ls).kind).not.toBe("go");
      }),
      { numRuns: 1000 },
    );
  });

  it("a lease on a thing the write does not touch never changes the verdict", () => {
    fc.assert(
      fc.property(write, leases, lease, (w, ls, extra) => {
        const touched = new Set([w.thing, ...(w.spot ?? [])]);
        fc.pre(!touched.has(extra.thing) && !ls.some((l) => l.thing === extra.thing));
        expect(rightOfWay(w, [...ls, extra])).toEqual(rightOfWay(w, ls));
        expect(rightOfWay(w, [extra, ...ls])).toEqual(rightOfWay(w, ls));
      }),
      { numRuns: 1000 },
    );
  });

  it("is pure: same input, same verdict, inputs untouched", () => {
    fc.assert(
      fc.property(write, leases, (w, ls) => {
        const before = JSON.stringify([w, ls]);
        const a = rightOfWay(w, ls);
        const b = rightOfWay(structuredClone(w), structuredClone(ls));
        expect(a).toEqual(b);
        expect(JSON.stringify([w, ls])).toBe(before);
      }),
    );
  });

  it("a choice naming someone other than the writer is always ask, whatever the leases", () => {
    fc.assert(
      fc.property(write, leases, (w, ls) => {
        const mine = idOf(w.by);
        const others = w.choice?.people.filter((p) => p.id === undefined || p.id !== mine) ?? [];
        fc.pre(others.length > 0);
        const v = rightOfWay(w, ls);
        expect(v.kind).toBe("ask");
        if (v.kind === "ask") expect(v.who).toEqual(others);
      }),
      { numRuns: 1000 },
    );
  });

  it("the verdict is always one of the four kinds", () => {
    fc.assert(fc.property(write, leases, (w, ls) => { expect(["go", "ask", "wait", "never"]).toContain(rightOfWay(w, ls).kind); }));
  });
});
