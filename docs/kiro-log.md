# Kiro evidence log

Running log for the Kiro write-up. Newest entries last. Only things that actually happened.

## 2026-10-14: property tests on the upstream pure modules

Installed `vitest` and `fast-check` (dev deps), `npm test` = `vitest --run`, `vitest.config.ts` (node env, `src/**/*.test.ts`, `convex/**/*.test.ts`).
Result: 4 test files, 132 tests, all passing; `npx tsc -b --noEmit` clean.

| File | Tests | Properties |
|---|---|---|
| `src/lib/rightOfWay.test.ts` | 36 | the 31 CASES rows as examples; a write to a card held by another person never returns `go`; adding a lease on an untouched thing never changes the verdict; pure/deterministic and inputs unmutated; a choice naming someone other than the writer is always `ask` with exactly those people; verdict kind is one of four |
| `src/lib/deck/place.test.ts` | 6 | spots are finite integers, one per card; no overlap with each other or any widget at GAP 24 (HELD_GAP 64 for held widgets); at or past origin + PAD; deterministic; a small card on an empty board lands inside the view |
| `src/lib/deck/schema.test.ts` | 85 | for each of 19 catalog schemas + a synthetic one: `checkSettings` never throws on arbitrary JSON / shaped junk, ok output satisfies an independent validator (text length, list min/max and item length, enum membership, number range, rows), idempotent on its own output, generator reaches the ok branch; plus field rules (clip, clamp, enum, JSON-string input, real calendar dates) |
| `src/lib/deck/prompt.test.ts` | 5 | `parseDeal` never throws; a stream cut at arbitrary points and committed incrementally equals the whole parse; a longer prefix only appends items; prose between objects is skipped; `none` semantics |

Note: a first version of the schema generator used fully arbitrary values and almost never reached the ok branch (fast-check aborted with "too many pre-condition failures", 0 runs). Fixed with per-field shaped generators and a coverage test that asserts the ok branch is hit.

### Bug caught by a property: impossible dates accepted

- Property: a `date` field only accepts real calendar dates.
- Counterexample (fast-check, shrunk): `{"y":1990,"m":2,"d":29}`, i.e. `"1990-02-29"` came back `ok`.
- Cause: `checkSettings` validated dates with `new Date("YYYY-MM-DDT00:00:00")`, which rolls Feb 29/30 over into March instead of returning Invalid Date, so a model answer like `2026-02-30` passed and later read as Mar 2.
- Fix (`src/lib/deck/schema.ts`, date case): also require the year/month/day parsed back from `Date.UTC` to equal the input. Regression covered by the property (1000 runs).

### Observations, not changed
- `num` fields coerce non-numeric strings to 0 then clamp: `"abc"` becomes the field's min instead of failing, because `"abc".replace(/[^0-9.-]/g, "")` is `""` and `Number("")` is 0. Not covered by a failing property (output is still in range); worth a decision later.
