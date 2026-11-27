import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CATALOG } from "./catalog";
import { checkSettings, date, list, num, oneOf, rows, text, zone, type Field, type Schema } from "./schema";

/** An independent validator for the DSL: does `v` satisfy field `f`? */
function valid(f: Field, v: unknown): boolean {
  switch (f.kind) {
    case "text":
      return typeof v === "string" && v.length > 0 && v.length <= f.max;
    case "number":
      return typeof v === "number" && Number.isFinite(v) && v >= f.min && v <= f.max && (!f.int || Number.isInteger(v));
    case "enum":
      return typeof v === "string" && f.values.includes(v);
    case "list":
      return Array.isArray(v) && v.length >= f.min && v.length <= f.max && v.every((x) => typeof x === "string" && x.length > 0 && x.length <= f.itemMax);
    case "rows":
      return (
        Array.isArray(v) &&
        v.length >= f.min &&
        v.length <= f.max &&
        v.every((r) => r && typeof r === "object" && f.keys.every((k) => typeof r[k] === "string" && r[k].length <= f.itemMax) && f.keys.some((k) => r[k]))
      );
    case "date":
      return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    case "zone":
      return typeof v === "string" && v.length > 0;
  }
}

const schemas: [string, Schema][] = CATALOG.map((c) => [c.id, c.settings as Schema]);
const synthetic: Schema = {
  t: text(12),
  n: num(1, 9),
  e: oneOf(["red", "Green", "blue"] as const),
  l: list(1, 3, { itemMax: 5 }),
  r: rows(["a", "b"], 1, 2, { itemMax: 4 }),
  d: date({ optional: true }),
  z: zone({ optional: true }),
  o: text(5, { optional: true }),
  dflt: num(0, 10, { default: 3 }),
};
schemas.push(["synthetic", synthetic]);

const anything = fc.oneof(fc.jsonValue(), fc.anything(), fc.string());
/** Objects keyed by the schema's own keys, filled with arbitrary values: reaches deep into each field. */
const word = fc.oneof(fc.constantFrom("a", "hello", "14", "UTC", "2026-10-18", "red", "Green", "Europe/Paris", "  padded  "), fc.string({ maxLength: 60 }));
const plausible = fc.oneof(
  word,
  fc.integer({ min: -50, max: 500 }),
  fc.double({ noNaN: true, min: -1e4, max: 1e4 }),
  fc.array(fc.oneof(word, fc.integer()), { maxLength: 12 }),
  fc.array(fc.dictionary(fc.constantFrom("a", "b", "name", "label", "who", "what", "when", "item", "owes"), fc.oneof(word, fc.integer())), { maxLength: 12 }),
  anything,
);
/** Per-field generator: mostly values shaped for the field (so the ok branch runs), some arbitrary junk. */
const nearly = (f: Field): fc.Arbitrary<unknown> => {
  const shaped: fc.Arbitrary<unknown> = (() => {
    switch (f.kind) {
      case "text":
        return fc.string({ maxLength: f.max * 2 });
      case "number":
        return fc.oneof(fc.integer({ min: f.min - 20, max: f.max + 20 }), fc.double({ noNaN: true, noDefaultInfinity: true }), fc.integer().map((n) => `~${n}`));
      case "enum":
        return fc.constantFrom(...f.values).map((v) => (v.length > 1 ? ` ${v.toUpperCase()} ` : v));
      case "list":
        return fc.oneof(fc.array(fc.oneof(fc.string({ maxLength: f.itemMax * 2 }), fc.integer()), { maxLength: f.max + 4 }), fc.array(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: f.max + 4 }).map((a) => a.join(", ")));
      case "rows":
        return fc.array(fc.dictionary(fc.constantFrom(...f.keys), fc.oneof(fc.string({ maxLength: f.itemMax * 2 }), fc.integer())), { maxLength: f.max + 4 });
      case "date":
        return fc.date({ min: new Date("1990-01-01"), max: new Date("2060-01-01"), noInvalidDate: true }).map((d) => d.toISOString());
      case "zone":
        return fc.constantFrom("UTC", "Europe/Paris", "America/New_York", "Mars/Base", " Asia/Tokyo ", "");
    }
  })();
  return fc.oneof({ weight: 6, arbitrary: shaped }, { weight: 1, arbitrary: plausible });
};
const keyed = (s: Schema) => fc.record(Object.fromEntries(Object.entries(s).map(([k, f]) => [k, nearly(f)])), { requiredKeys: [] });

describe.each(schemas)("checkSettings on %s", (_id, schema) => {
  it("never throws on arbitrary input", () => {
    fc.assert(fc.property(anything, (raw) => void checkSettings(schema, raw)), { numRuns: 300 });
    fc.assert(fc.property(keyed(schema), (raw) => void checkSettings(schema, raw)), { numRuns: 300 });
  });

  it("a successful result always satisfies every field of the schema", () => {
    fc.assert(
      fc.property(keyed(schema), (raw) => {
        const r = checkSettings(schema, raw);
        if (!r.ok) return;
        const out = r.value as Record<string, unknown>;
        for (const [k, f] of Object.entries(schema)) {
          if (out[k] === undefined) expect(f.optional || f.default !== undefined).toBe(true);
          else if (!(f.default !== undefined && out[k] === f.default)) expect(valid(f, out[k]), `${k}: ${JSON.stringify(out[k])}`).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("is idempotent: re-checking its own output succeeds with the same value", () => {
    fc.assert(
      fc.property(keyed(schema), (raw) => {
        const r = checkSettings(schema, raw);
        if (!r.ok) return;
        const again = checkSettings(schema, r.value);
        expect(again.ok).toBe(true);
        if (again.ok) expect(again.value).toEqual(r.value);
      }),
      { numRuns: 300 },
    );
  });
});

describe("checkSettings field rules", () => {
  it("text is trimmed and clipped to max", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 80 }), fc.integer({ min: 2, max: 30 }), (s, max) => {
        const r = checkSettings({ t: text(max) }, { t: s });
        if (r.ok) expect(r.value.t.length).toBeLessThanOrEqual(max);
        else expect(s.trim()).toBe("");
      }),
    );
  });

  it("numbers are clamped into range", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }), (n) => {
        const r = checkSettings({ n: num(2, 7) }, { n });
        expect(r.ok && r.value.n >= 2 && r.value.n <= 7).toBe(true);
      }),
    );
  });

  it("enum accepts only declared values, case-insensitively", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = checkSettings({ e: oneOf(["red", "Green"] as const) }, { e: s });
        if (r.ok) expect(["red", "Green"]).toContain(r.value.e);
      }),
    );
  });

  it("settings given as a JSON string parse like the object", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== ""), (s) => {
        const sc = { t: text(30) };
        expect(checkSettings(sc, JSON.stringify({ t: s }))).toEqual(checkSettings(sc, { t: s }));
      }),
    );
  });
});

describe("generator coverage", () => {
  it.each(schemas)("%s: the generator reaches the ok branch often enough to mean something", (_id, schema) => {
    const oks = fc.sample(keyed(schema), { numRuns: 500, seed: 7 }).filter((raw) => checkSettings(schema, raw).ok).length;
    expect(oks).toBeGreaterThan(5);
  });
});

describe("date field", () => {
  it("only accepts real calendar dates (no rolling Feb 30 into March)", () => {
    const day = fc.record({ y: fc.integer({ min: 1990, max: 2060 }), m: fc.integer({ min: 1, max: 12 }), d: fc.integer({ min: 1, max: 40 }) });
    fc.assert(
      fc.property(day, ({ y, m, d }) => {
        const s = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const real = new Date(Date.UTC(y, m - 1, d));
        const isReal = real.getUTCFullYear() === y && real.getUTCMonth() === m - 1 && real.getUTCDate() === d;
        expect(checkSettings({ d: date() }, { d: s }).ok, s).toBe(isReal);
      }),
      { numRuns: 1000 },
    );
  });
});
