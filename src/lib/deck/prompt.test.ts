import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseDeal } from "./prompt";

const words = (max: number) => fc.string({ minLength: 1, maxLength: max }).filter((s) => s.trim() !== "");
const lines = fc.array(
  fc.oneof(
    fc.record({ card: fc.constant("note"), settings: fc.record({ text: words(30) }) }),
    fc.record({ card: fc.constant("poll"), settings: fc.record({ question: words(20), options: fc.array(words(8), { minLength: 2, maxLength: 4 }) }) }),
    fc.record({ card: fc.constant("countdown"), settings: fc.record({ event: fc.constant("party"), date: fc.constant("2026-10-18") }) }),
  ),
  { minLength: 1, maxLength: 5 },
);

/** Cut `s` at the given fractions of its length (sorted, deduped). */
function chunks(s: string, cuts: number[]): string[] {
  const at = [...new Set(cuts.map((c) => Math.floor(c * s.length)))].sort((a, b) => a - b);
  const out: string[] = [];
  let prev = 0;
  for (const a of at) {
    out.push(s.slice(prev, a));
    prev = a;
  }
  out.push(s.slice(prev));
  return out;
}

const cuts = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { maxLength: 12 });
const join = (ls: unknown[], sep = "\n") => ls.map((l) => JSON.stringify(l)).join(sep);

describe("parseDeal", () => {
  it("never throws on arbitrary strings", () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), fc.boolean(), (s, done) => void parseDeal(s, done)), { numRuns: 1000 });
    fc.assert(fc.property(fc.stringMatching(/^[{}":,a-z \n\\]{0,80}$/), fc.boolean(), (s, done) => void parseDeal(s, done)), { numRuns: 1000 });
  });

  it("a stream split at arbitrary boundaries yields the same cards as the whole string", () => {
    fc.assert(
      fc.property(lines, cuts, fc.boolean(), (ls, cs, trailingNewline) => {
        const whole = join(ls) + (trailingNewline ? "\n" : "");
        const final = parseDeal(whole, true);
        // The consumer commits items past the ones it already placed, on the growing buffer.
        let buf = "";
        const committed: unknown[] = [];
        for (const c of chunks(whole, cs)) {
          buf += c;
          committed.push(...parseDeal(buf).items.slice(committed.length));
        }
        committed.push(...parseDeal(buf, true).items.slice(committed.length));
        expect(committed).toEqual(final.items);
        expect(final.items.length).toBe(ls.length);
      }),
      { numRuns: 500 },
    );
  });

  it("a longer prefix only appends (items of a prefix are a prefix of the items)", () => {
    fc.assert(
      fc.property(lines, fc.double({ min: 0, max: 1, noNaN: true }), (ls, f) => {
        const whole = join(ls);
        const part = parseDeal(whole.slice(0, Math.floor(f * whole.length))).items;
        expect(parseDeal(whole).items.slice(0, part.length)).toEqual(part);
      }),
      { numRuns: 500 },
    );
  });

  it("prose and code fences between objects are skipped", () => {
    fc.assert(
      fc.property(lines, fc.stringMatching(/^[a-z .\n`]{0,20}$/), (ls, junk) => {
        const clean = parseDeal(join(ls), true).items;
        const noisy = parseDeal(junk + "\n" + join(ls, "\n" + junk + "\n") + "\n" + junk, true).items;
        expect(noisy.map((i) => i.raw)).toEqual(clean.map((i) => i.raw));
      }),
    );
  });

  it("none only when no card was dealt", () => {
    expect(parseDeal('{"card":"none"}').none).toBe(true);
    expect(parseDeal('{"card":"none"}\n{"card":"note","settings":{"text":"hi"}}').none).toBe(false);
  });
});
