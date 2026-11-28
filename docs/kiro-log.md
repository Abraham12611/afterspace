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

## 2026-11-27 · Hooks and file-match steering
- Added 4 hooks in `.kiro/hooks/`, each a small Node script in `scripts/hooks/` (inline `node -e` commands broke under
  the Windows shell because of `|` and quotes, so logic moved to files):
  - `test-pure-lib` (PostFileSave `src/lib/**/*.ts`): runs `vitest related` for the saved file, so property tests run on every rule change.
  - `no-removed-services` (PostFileSave `.ts/.tsx/.css`): warns if a file mentions AgentMail, Nebius/Nemotron, Tavily or Firecrawl.
  - `guard-reference` (PreToolUse on write tools): blocks edits inside `reference/ourspaces-app` (exit 2).
  - `provenance-check` (Stop): keeps the agent working if `LICENSE` lost the upstream MIT line.
- Each hook tested with simulated payloads before committing (guard blocked a reference path with exit 2; removed-service
  warning fired on a scratch file; vitest related ran 36 tests for `src/lib/rightOfWay.ts`).
- Added `inclusion: fileMatch` steering: `design.md` (UI files) and `convex.md` (backend files).
- Convex: project `afterspace` created from the CLI (`npx convex dev --once --configure new --team ... --project afterspace`);
  real codegen replaced the strip agent's hand-edited `_generated` types and added two modules the hand edit missed
  (`openrouter`, `tables/after`). Auth keys generated with `jose` and set without printing them. `seed:demo` seeded the coven (13 cards).

## 2026-11-29: F1 buddy list and F2 profile header data (Kiro)
- F1: `BuddyList.tsx` (floating window, bottom sheet on phones, away popover with presets, door sounds). Online comes from a per-space room in the presence component (`roomPresence.buddyBeat`, person taken from the session), so the list flips on its own timer without writing the `members` row every few seconds (that would re-run every `seatOf` query of that person). New `members` fields: `awayMessage`, `awaySince`, `idleSince`, `lastVisitAt`. Pure rules in `src/lib/buddy.ts` (+ tests). Door sounds are synthesized with Web Audio (no files to license).
- F2: pure `src/lib/top8.ts` with fast-check properties (length min(8, members-1), no viewer, deterministic, adding shared activity never lowers rank). `convex/top8.ts` gathers polls (vote time), rsvps and splits (card creation time, the data has no stamp), and card threads. `convex/visits.ts`: `recordVisit` (one per member per 30 min), `counter`, `seedDemo`. Guestbook is the space chat opened with the title "guestbook" from a header button, no new card type.
- Verified by build, tests and `npx convex run` against dev. Not verified visually (no dev server here).