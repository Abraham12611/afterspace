# Build phases (progress tracker)

Tick boxes as work lands. Each sub-phase ends with a commit. Each phase starts by writing its Kiro spec in
`.kiro/specs/<phase-id>/` (requirements, design, tasks) from the docs linked below.

Deadline: **Fri Dec 4, 2026, 2:00 PM PT (11:00 PM GMT+1)**. Aim to submit Dec 4 morning.

## Day plan
| Day | Date | Phases |
|---|---|---|
| 1 | Thu Nov 26 | P0, P1 (S1-S4) |
| 2 | Fri Nov 27 | P1 (S5-S9), P1.2 OpenRouter green |
| 3 | Sat Nov 28 | P2.1-P2.4 |
| 4 | Sun Nov 29 | P2.5-P2.6, P3.1 F1, P3.2 F2 |
| 5 | Mon Nov 30 | P3.3 F4 pet + graveyard |
| 6 | Tue Dec 1 | P3.4 F5 spirit board, P3.5 F7 receipts |
| 7 | Wed Dec 2 | P3.6 F6 letters, P3.7 F8 séance, P3.8 F3 player, P4 |
| 8 | Thu Dec 3 | P5 deploy + seed, record video, write-ups |
| 9 | Fri Dec 4 | P6 submit before noon PT |

---

## P0. Setup
- [x] **P0.1 Repo.** Public GitHub repo `afterspace`. Root has `.kiro/` and `docs/plan/` already.
- [x] **P0.2 Import.** Copy upstream at `45bebcb` (without its `.git`, `node_modules`, `reference/`) into the
      repo root. Commit `import: ourspaces-app @ 45bebcb (MIT, Thomas Nguyen)`. Tag `upstream-import`.
      Merge our `.gitignore` with theirs.
- [ ] **P0.3 Runs as-is.** `npm install`, `npx convex dev` on a new deployment. Note what breaks without keys.
- [x] **P0.4 License.** `LICENSE`: keep upstream line, add `Copyright (c) 2026 <you>`. Set GitHub About license.
- [ ] **P0.5 Kiro setup.** Hooks and MCP from `kiro-usage.md`. Add Vitest + fast-check, `npm test`.

## P1. Strip (docs: `03-architecture/strip-plan.md`)
- [x] P1.1 S1 AgentMail + OTP out
- [x] P1.2 S2 Nebius → OpenRouter (`openrouter.md`); choose model ids; canned fallbacks work
- [x] P1.3 S3 Tavily out
- [x] P1.4 S4 Firecrawl, build room, link cards out
- [x] P1.5 S5 RAG, agent, similar out
- [x] P1.6 S6 labs, reels, pilot, eval, upstream docs out
- [x] P1.7 S7 personal data + assets out; placeholder assets in
- [x] P1.8 S8 flappy / backendLive out
- [ ] P1.9 S9 green build + U1-U4 pass (typecheck, lint, build are green; `npx convex dev` codegen and U1-U4 not run yet: see file-manifest.md "P1 as built")
**Exit:** builds and runs with only `OPENROUTER_API_KEY`; no reference to removed services (`grep` clean).

## P2. Rebrand (docs: `02-design/*`)
- [x] P2.1 Name + copy pass (brand.md table, `index.html` title, meta, favicon)
- [x] P2.2 Tokens + fonts (design-system.md)
- [x] P2.3 Card frames + per-type silhouettes + red string
- [x] P2.4 Layout moves (layout-changes.md): header band, tab strip, crystal ball bar, demo ribbon
- [x] P2.5 Mascots + 12 avatars + stickers (generate, review, add to `public/`). Art in `public/{brand,icons,mascots,ui,avatars}`; wiring into components happens in P2.3/P2.4/P3
- [ ] P2.6 Join modal, welcome page, grimoire page restyle; sounds swapped. Join, welcome and grimoire done; sounds still to swap (see file-manifest "P2 as built")
**Exit:** side-by-side with upstream screenshots, no screen looks the same.

## P3. New features (docs: `01-product/features-new.md`)
- [ ] P3.1 F1 buddy list + away messages + door sounds
- [ ] P3.2 F2 profile header: Top 8 (`src/lib/top8.ts` + PBT), visitor counter, guestbook
- [ ] P3.3 F4 pet: `src/lib/familiar.ts` + PBT, cron, states art, popover, graveyard page, revive
- [ ] P3.4 F5 spirit board: `src/lib/spiritBoard.ts` + PBT, card, server lock
- [ ] P3.5 F7 receipt photo → split: `src/lib/receipt.ts` + PBT, capture sheet, vision call, confirm
- [ ] P3.6 F6 sealed letters + time capsule
- [ ] P3.7 F8 séance sheet
- [ ] P3.8 F3 y2k player
- [ ] P3.9 F9 space skins (cut first)
**Exit:** U1-U10 in user-flows.md pass on desktop and phone.

## P4. Quality
- [ ] P4.1 PBT for upstream `rightOfWay()` and `placeCards()` (adds Kiro PBT story)
- [ ] P4.2 Phone pass at 375 px for every page and sheet
- [ ] P4.3 Accessibility: contrast, focus rings, keyboard for picker/sheets, reduced motion
- [ ] P4.4 Limits: spend ceiling, rate limits, upload checks (security.md)
- [ ] P4.5 Perf: first paint from snapshot < 1 s on 4G; no console errors

## P5. Deploy + demo data
- [ ] P5.1 Production Convex + Netlify; env vars set
- [ ] P5.2 Seeds: the coven, the crypt, long distance; admin reset + fast-forward
- [ ] P5.3 Real-group pilot: invite one real friend group; collect basic counts for the write-up

## P6. Submission (docs: `05-submission/*`)
- [ ] P6.1 README (what, run, Built on, Prior art, license)
- [ ] P6.2 Demo video < 3 min, public on YouTube
- [ ] P6.3 Kiro write-up
- [ ] P6.4 Blog post + social post `#KiroweenHackathon26`
- [ ] P6.5 Devpost form: Frankenstein; Startup (if ready); links; disclosure
