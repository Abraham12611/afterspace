# Testing

`npm test` runs Vitest once. Tests sit next to the pure module (`src/lib/x.ts` → `src/lib/x.test.ts`).

## Property-based tests (fast-check)
| Module | Properties |
|---|---|
| `src/lib/rightOfWay.ts` (upstream) | Never `go` for a write to a card held by someone else (unless the holder is the asker); adding an unrelated lease never changes the verdict; writes touching others' choices are always `ask`; pure (same input, same output) |
| `src/lib/deck/place.ts` (upstream) | Placed rects never overlap each other or existing widgets; held cards keep their berth; stays inside bounds when space exists |
| `src/lib/deck/schema.ts checkSettings` (upstream) | Never throws on any JSON; output always passes the schema |
| `src/lib/familiar.ts` | Health in 0-100; adding an event never lowers health; no events + time passing never raises health; state thresholds match health |
| `src/lib/top8.ts` | Length = min(8, members-1); never includes viewer; deterministic; more shared activity never lowers rank |
| `src/lib/spiritBoard.ts` | Planchette = mean of holders; lock only with ≥2 holders and ≥3 s dwell on one answer; moving off resets dwell |
| `src/lib/receipt.ts` | Shares sum exactly to total in cents; shares differ by ≤1 cent; invalid model JSON → null, never throws |

## Unit tests
- `parseDeal` on streamed chunks split at every byte position.
- OpenRouter response parsing (stream deltas, error bodies) with recorded fixtures.
- Canned fallback parser for "poll for X", "countdown to X on DATE", "list for X".

## Manual checks
User flows U1-U10 (`01-product/user-flows.md`) on Chrome desktop + a real phone, two sessions.

## Before every commit (enforced by a hook, see kiro-usage.md)
`npm run typecheck` and `npm test` pass.

## Status (2026-10-14)
Vitest + fast-check are installed (`npm test`, config in `vitest.config.ts`). Written so far, all passing (132 tests):
- `src/lib/rightOfWay.test.ts`: the 31-row CASES table plus 5 properties (held-by-other never `go`, unrelated lease never changes the verdict, purity, other people's choices always `ask`, verdict kinds).
- `src/lib/deck/place.test.ts`: 6 tests (no overlap with GAP / HELD_GAP berths, finite integer spots, origin + padding, determinism, empty-board-in-view).
- `src/lib/deck/schema.test.ts`: 85 tests (never throws, output satisfies an independent validator, idempotent, generator coverage guard; run against all 19 catalog schemas plus a synthetic one; field rules incl. real calendar dates).
- `src/lib/deck/prompt.test.ts`: 5 tests (`parseDeal` never throws, chunked stream equals whole, prefix only appends, prose skipped, `none`).
Evidence log with the bug the properties caught: `docs/kiro-log.md`.
