# How we use Kiro (this becomes the write-up)

Technological Implementation is 20% of the score and asks for variety, depth and experimentation.
Record evidence as we go: screenshots, hook output, before/after diffs, timings. Keep a running log in
`docs/kiro-log.md` (one line per notable moment).

## Specs (spec-driven development)
- One spec per phase: `.kiro/specs/p1-strip/`, `p2-rebrand/`, `p3-buddy-list/`, `p3-top8/`, `p3-pet/`,
  `p3-spirit-board/`, `p3-receipts/`, `p3-letters/`, `p3-seance/`.
- Requirements in EARS form, copied from features-new.md acceptance checks.
- Write-up angle: the strip phase as a spec ("remove X without breaking Y") vs vibe-coding the visual
  polish. Compare which went faster and which broke less.

## Steering (`.kiro/steering/`)
- `product.md`, `tech.md`, `structure.md`, `provenance.md` (always included).
- Add `design.md` with `inclusion: fileMatch` on `src/**/*.css` and `src/components/**`, holding the tokens
  and shape rules, so styling work always sees the design system.
- Add `convex.md` with `inclusion: fileMatch` on `convex/**` for Convex rules (validators, seat checks,
  internal functions).

## Hooks (`.kiro/hooks/`)
| Hook | Trigger | Action | Why |
|---|---|---|---|
| typecheck-on-save | PostFileSave `\.(ts|tsx)$` | `npm run typecheck` | Catch strip breakage immediately |
| test-pure-lib | PostFileSave `src/lib/.*\.ts$` | `npx vitest --run related <file>` | PBT runs on every rule change |
| no-removed-services | PostFileSave `\.(ts|tsx)$` | grep for `agentmail|nebius|nemotron|tavily|firecrawl` and fail | Stops removed services coming back |
| guard-reference | PreToolUse on write tools | block writes under `reference/` | Upstream copy stays untouched |
| provenance-check | Stop | ensure `LICENSE` still has the upstream line | License compliance |
| manifest-reminder | PostFileDelete | remind to update `file-manifest.md` | Disclosure stays accurate |

## MCP
| Server | Use |
|---|---|
| Firecrawl | Research (2025 winners, rules, OpenRouter docs) |
| Context7 | Current Convex, Convex Auth, Tailwind v4, OpenRouter docs while coding |
| fal | Generate mascot and avatar art (P2.5), then review by hand |
| Exa | Look up royalty-free sounds and music |

## Custom agent
`strip-surgeon`: an agent with read/grep/edit tools whose prompt knows strip-plan.md. It removes one service
at a time, runs typecheck, and reports what it touched. Shows "custom agents" in the write-up.

## Kiro powers
Check the powers list at P0.5 for anything Convex- or design-related; note what was used and what wasn't.

## Property-based testing
See testing.md. The write-up should name one bug PBT caught (keep notes when it happens).

## Numbers to collect for the write-up
Specs written, tasks completed, hooks fired (count), lines removed vs added since `upstream-import`, tests and
properties, days.
