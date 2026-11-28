import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { rankMembers, top8, whyLine, TOP8_WINDOW_MS, type Interaction, type InteractionKind } from "./top8";

const NOW = 10 * TOP8_WINDOW_MS;
const kinds: InteractionKind[] = ["poll", "rsvp", "split", "thread", "letter"];

const membersArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 14 }), { minLength: 1, maxLength: 15 })
  .map((ids) => ids.map((n) => ({ id: `u${n}`, name: `name${n % 5}` })));

function interactionsFor(ids: string[]) {
  return fc.array(
    fc.record({
      memberId: fc.constantFrom(...ids, "stranger"),
      kind: fc.constantFrom(...kinds),
      at: fc.integer({ min: NOW - TOP8_WINDOW_MS - 1000, max: NOW + 1000 }),
    }),
    { maxLength: 40 },
  );
}

const scenario = membersArb.chain((members) =>
  fc.record({
    members: fc.constant(members),
    viewer: fc.constantFrom(...members.map((m) => m.id)),
    items: interactionsFor(members.map((m) => m.id)),
  }),
);

describe("top8", () => {
  it("has length min(8, members-1) and never contains the viewer", () => {
    fc.assert(
      fc.property(scenario, ({ members, viewer, items }) => {
        const out = top8(viewer, items, NOW, members);
        expect(out.length).toBe(Math.min(8, members.length - 1));
        expect(out.some((e) => e.id === viewer)).toBe(false);
        expect(new Set(out.map((e) => e.id)).size).toBe(out.length);
      }),
    );
  });

  it("is deterministic and ignores input order", () => {
    fc.assert(
      fc.property(scenario, ({ members, viewer, items }) => {
        const a = top8(viewer, items, NOW, members);
        const b = top8(viewer, [...items].reverse(), NOW, [...members].reverse());
        expect(b).toEqual(a);
      }),
    );
  });

  it("adding shared activity never lowers that member's rank", () => {
    fc.assert(
      fc.property(
        scenario,
        fc.constantFrom(...kinds),
        fc.integer({ min: NOW - TOP8_WINDOW_MS, max: NOW }),
        fc.nat(),
        ({ members, viewer, items }, kind, at, pick) => {
          const others = members.filter((m) => m.id !== viewer);
          if (!others.length) return;
          const target = others[pick % others.length];
          const before = rankMembers(viewer, items, NOW, members).findIndex((e) => e.id === target.id);
          const after = rankMembers(viewer, [...items, { memberId: target.id, kind, at }], NOW, members).findIndex(
            (e) => e.id === target.id,
          );
          expect(after).toBeLessThanOrEqual(before);
        },
      ),
    );
  });

  it("weights, window and tie-breaks", () => {
    const members = [
      { id: "me", name: "me" },
      { id: "a", name: "ash" },
      { id: "b", name: "bea" },
      { id: "c", name: "cy" },
    ];
    const day = 24 * 60 * 60 * 1000;
    const items: Interaction[] = [
      { memberId: "a", kind: "poll", at: NOW - day },
      { memberId: "b", kind: "poll", at: NOW - 2 * day },
      { memberId: "c", kind: "rsvp", at: NOW - 3 * day },
      { memberId: "c", kind: "poll", at: NOW - TOP8_WINDOW_MS - 5 }, // outside the window
    ];
    const out = top8("me", items, NOW, members);
    expect(out.map((e) => e.id)).toEqual(["c", "a", "b"]); // rsvp 2 > polls 1; tie a/b by most recent
    expect(out[0].score).toBe(2);
  });

  it("describes why", () => {
    expect(whyLine({ poll: 3 })).toBe("3 polls together");
    expect(whyLine({ poll: 1, rsvp: 1, split: 1 })).toBe("1 rsvp together · split 1 expense");
    expect(whyLine({})).toBe("haven't crossed paths lately");
  });
});
