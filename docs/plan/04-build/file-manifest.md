# File manifest

Every file to delete (D), modify (M) or create (C), by phase. Paths are from the repo root after the import.
Update this file when reality differs (provenance rule).

## P0. Setup
| Op | Path | Notes |
|---|---|---|
| C | (whole upstream tree) | Import at `45bebcb`, tag `upstream-import` |
| M | `LICENSE` | Add our copyright line below upstream's |
| M | `.gitignore` | Merge: add `reference/`, `design-directions/` |
| M | `package.json` | name `afterspace`; add `vitest`, `fast-check`; script `test: vitest --run`, `typecheck` |
| C | `vitest.config.ts` | |
| C | `.kiro/hooks/*.json` | From kiro-usage.md |
| C | `.kiro/steering/design.md`, `convex.md` | fileMatch steering |
| C | `docs/kiro-log.md` | Running evidence log |

## P1. Strip
### Delete
| Path | Step |
|---|---|
| `convex/agentmail.ts`, `inbox.ts`, `inboxRouting.ts`, `mailArrival.ts`, `otp.ts`, `emails/`, `components/agentMail/` | S1 |
| `src/pages/MailReel.tsx`, `mailReel.css`, `MailLabBar.tsx`, `src/lib/mailLabCake.ts`, `mockArrival.ts` | S1 |
| `convex/nebius.ts` | S2 |
| `convex/tavily.ts`, `src/components/LookupReceipt.tsx`, `LookupTick.tsx`, `lookup.css` | S3 |
| `convex/firecrawl.ts`, `batch.ts` | S4 |
| `src/components/CrawlStrip.tsx`, `ReadingRoom.tsx`, `LinkReadReceipt.tsx`, `LinkThreads.tsx`, `link-threads.css`, `LinkQuestionStrip.tsx`, `ShipRoom.tsx` | S4 |
| `src/widgets/buildroom.tsx`, `linkRead.tsx`, `link-read.css`, `webPic.tsx`, `web-pic.css` | S4 |
| `src/lib/buildRoomFeed.ts`, `buildRoomPresentation.ts`, `linkQuestions.ts`, `linkRanking.ts`, `src/data/buildroom.ts` | S4 |
| `src/pages/FirecrawlReel.tsx`, `firecrawlReel.css`, `ArrivalLab.tsx` | S4 |
| `convex/rag.ts`, `agent.ts`, `similar.ts` (+ `streaming.ts` if séance doesn't stream) | S5 |
| `src/pages/CodexReel.tsx`, `codexReel.css`, `Outro.tsx`, `outro.css`, `ColorLab.tsx`, `CursorLab.tsx`, `WidgetLab.tsx`, `WidgetWall.tsx`, `LiveBlock.tsx`, `Block.tsx`, `labs.css` | S6 |
| `src/components/PlayLab.tsx`, `convex/pilot.ts`, `harness.ts`, `playLab.ts`, `shootReset.ts` | S6 |
| `src/lib/rowMock.ts`, `src/live/labPeers.ts` (if only labs import them) | S6 |
| `eval/`, `docs/` (upstream contents, keep our `docs/plan/`), `hackathon.md`, `DESIGN.md`, `.claude/`, `.agents/`, `skills-lock.json`, `.github/readme/` | S6 |
| `public/photos/`, `public/avatars/`, `public/demo-video-assets/` | S7 |
| `src/data/family.ts`, `family.css` (if real family room) | S7 |
| `src/components/games/Flappy.tsx`, `flappy.css` | S8 |

### Modify
| Path | Change | Step |
|---|---|---|
| `convex/convex.config.ts` | Remove agentMail, firecrawl, agent, rag, batchWorker, (actionCache, persistentTextStreaming, presence) mounts and their env | S1-S5 |
| `convex/http.ts` | Remove AgentMail webhook (and ask-stream if cut); keep radio + auth routes | S1, S5 |
| `convex/auth.ts` | Providers: Anonymous + optional Google | S1 |
| `convex/schema.ts`, `convex/tables/mail.ts`, `tables/rooms.ts` | Drop removed tables/fields (data-model.md) | S1, S5 |
| `convex/ai.ts` | `MODEL_BY_JOB` for OpenRouter | S2 |
| `convex/voiceBuild.ts`, `recap.ts`, `digest.ts`, `questions.ts`, `games.ts`, `roomBrief.ts`, `choiceVotes.ts`, `guard.ts`, `rateLimits.ts`, `seat.ts`, `widgets.ts`, `spaces.ts`, `leases.ts`, `edits.ts`, `crons.ts`, `admin.ts`, `widgetData.ts` | Imports/calls/comments updated for removals | S1-S5 |
| `convex/seed.ts` | New fictional cast and spaces | S7 |
| `src/App.tsx` | Remove lab/reel/mail/play routes | S6 |
| `src/data/types.ts` | Remove cut card types | S4, S8 |
| `src/components/WidgetCard.tsx` | Remove cut type cases | S4, S8 |
| `src/live/useVoiceBuild.ts`, `useLiveHandlers.ts`, `useSpaceWork.ts`, `useJoin.ts` | Remove removed-service paths | S1-S4 |
| `src/pages/LiveSpace.tsx`, `About.tsx` | Remove removed-service UI | S1-S6 |
| `src/components/RightOfWay.tsx`, `VoiceBuildLayer.tsx`, `WidgetEditorPanel.tsx`, `OrbHint.tsx`, `NewRoom.tsx`, `JoinForm.tsx` | Remove removed-service references | S1-S4 |
| `src/widgets/core.tsx` | Remove Tavily lookup bits | S3 |
| `package.json` | Remove `@firecrawl/firecrawl-convex`, `@convex-dev/agent`, `@convex-dev/rag`, unused `@ai-sdk/*`/`ai`, `@convex-dev/batch-worker`, `@convex-dev/action-cache` (if unused) | S4-S5 |

### Create
| Path | Notes | Step |
|---|---|---|
| `convex/openrouter.ts` | openrouter.md | S2 |
| `src/lib/fallbackDeal.ts` + test | Canned rule-based asks | S2 |

## P2. Rebrand
| Op | Path | Notes |
|---|---|---|
| M | `index.html` | Title, meta, OG image, favicon |
| M | `src/index.css` | Font import, `@theme` tokens, board surface, fog |
| M | `src/components/WidgetCard.tsx` + card CSS | Frames, silhouettes, pins |
| M | `src/widgets/flowMarks.tsx` | Red string |
| M | `src/components/Rail.tsx` | Becomes the tab strip |
| C | `src/components/ProfileHeader.tsx` | Header band (shell in P2, content in P3.2) |
| M | `src/components/ActionDock.tsx`, `VoiceOrb.tsx`, `voice-stage.css`, `orbHint.css` | Crystal ball bar |
| M | `src/components/DemoBanner.tsx` | Plum ribbon |
| M | `src/components/JoinForm.tsx`, `LookRow.tsx` | Guestbook-page join |
| M | `src/components/PeerCursor.tsx`, `OwnCursor.tsx`, `ownCursor.css`, `src/cursors/*` | Planchette cursors |
| M | `src/components/RightOfWay.tsx`, `right-of-way.css` | Candle halo |
| M | `src/components/RoomKnows.tsx`, `RoomKnowsObjects.tsx`, `room-knows.css` | The grimoire |
| M | `src/lib/routes.ts`, `src/App.tsx` | `/knows` → `/grimoire` (+ redirect) |
| M | `src/pages/Welcome.tsx`, `About.tsx`, `Me.tsx` | New layout and copy |
| M | `src/data/avatars.ts`, `stickers.ts`, `spaceThemes.ts`, `templates.ts`, `spaces.ts` | New assets and skins |
| C | `public/avatars/*` (12), `public/mascots/*` (wisp ×5 states, pip, bones, planchette), `public/mascots/README.md` | Our art |
| C | `public/sounds/*` + `README.md` | Door creak/close, thump, rustle, chime, chirp, sigh |
| M | all user-visible strings | brand.md copy table |

## P3. New features
| Op | Path | Feature |
|---|---|---|
| M | `convex/tables/rooms.ts` | `members.awayMessage`, `awaySince`, `lastVisitAt`; `spaces.mood`, `skin`, `songUrl`, `songTitle` |
| C | `convex/tables/after.ts`; M `convex/schema.ts` | New tables (data-model.md) |
| C | `src/components/BuddyList.tsx`, `buddy-list.css` | F1 |
| M | `convex/presence.ts`, `convex/spaces.ts` | F1 away messages, visits |
| M | `src/lib/sounds.ts` | F1 door sounds |
| C | `src/lib/top8.ts`, `top8.test.ts`, `convex/top8.ts` | F2 |
| M | `src/components/ProfileHeader.tsx` | F2 |
| C | `src/widgets/guestbook.tsx` | F2 |
| C | `src/widgets/y2kPlayer.tsx`, `y2k-player.css`; D `PlaylistWidget` in `src/widgets/extras.tsx` (radio now-playing route in `convex/http.ts` is reused) | F3 |
| C | `public/music/*`, `public/music/LICENSE.md` | F3 |
| C | `src/lib/familiar.ts`, `familiar.test.ts`, `convex/familiar.ts` | F4 |
| C | `src/components/FamiliarPet.tsx`, `familiar.css`, `src/pages/Graveyard.tsx` | F4 |
| M | `convex/crons.ts`, `convex/activity.ts` | F4 tick, activity kinds |
| C | `src/lib/spiritBoard.ts`, `spiritBoard.test.ts`, `convex/spiritBoard.ts`, `src/widgets/spiritBoard.tsx`, `spirit-board.css` | F5 |
| M | `src/lib/deck/catalog.ts`, `convex/widgetData.ts`, `src/data/types.ts`, `src/lib/widgetDefaults.ts`, `widgetLabels.ts`, `WidgetCard.tsx`, `WidgetPicker.tsx` | Register new card types (F2, F3, F4, F5) |
| C | `convex/letters.ts`, `src/components/LetterComposer.tsx` | F6 |
| M | `src/components/MailArrival.tsx`, `src/lib/mailArrival.ts`, `LetterWidget` in `src/widgets/extras.tsx` | F6 |
| C | `src/lib/receipt.ts`, `receipt.test.ts`, `convex/receipts.ts`, `src/components/ReceiptCapture.tsx` | F7 |
| C | `public/demo/receipt-sample.jpg` | F7 demo |
| M | `ExpenseSplitWidget` in `src/widgets/extras.tsx` | F7 "scan a receipt" |
| M | `convex/recap.ts`; C `src/components/SeanceSheet.tsx` | F8 |
| M | `src/data/spaceThemes.ts`, `SettingsSheet.tsx` | F9 |
| M | `src/pages/LiveSpace.tsx` | Mount header, buddy list, pet, séance, sheets |

## P4. Quality
| Op | Path |
|---|---|
| C | `src/lib/rightOfWay.test.ts`, `src/lib/deck/place.test.ts`, `src/lib/deck/schema.test.ts` |
| C | `src/lib/deck/prompt.test.ts` (parseDeal chunking) |
| M | CSS files as needed for 375 px, focus, reduced motion |

## P5-P6
| Op | Path |
|---|---|
| M | `convex/admin.ts` | Reset, pet fast-forward, mark away |
| M | `netlify.toml` | Site name |
| C | `README.md` (rewrite) | What, run, Built on, Prior art, license, demo URL |
| C | `docs/kiro-writeup.md` | Source for the Devpost Kiro section |

## P1 as built (deviations from the lists above)
Recorded when P1 landed. Where reality differed from the plan:

**Deleted beyond the list**
| Path | Why |
|---|---|
| `convex/digest.ts` | The weekly digest only existed to send email through AgentMail. Its cron, workflow and `digest` AI job went with it. |
| `convex/shootReset.ts`, `harness.ts`, `playLab.ts`, `pilot.ts` | Lab/eval helpers that read `emailEvents` or the removed rooms. |
| `convex/questions.ts`, `streaming.ts` | Link-card conversation starters and the ask-stream (S4/S5). No stream for the s�ance yet; it can use `streamChat` when built. |
| `src/components/CodeSlots.tsx` | Six-digit email code input (S1). |
| `src/lib/backendCounts.ts`, `src/lib/playPresets.ts` | backendLive card (S8) and the play lab (S6). |
| `src/data/crew.ts`, `src/data/family.ts`, `family.css` | Upstream cast (S7). |
| `src/widgets/poll-web.css`, `widgets/linkShelf`/`linkCard`/`backendLive` renderers in `extras.tsx` | Tavily/Firecrawl/backendLive leftovers. |
| `public/storyboard.html`, `public/assets/the-crew-snapshot*`, `public/assets/email/`, `firecrawl-*.svg`, `space-covers/the-family.png` | Upstream marketing, group photo, removed services. |
| `scripts/dev-lane.sh`, `sync-storyboard.sh`, `sync-codex-skills.sh`, `gen-video-srt.mjs` | Pointed at upstream deployments or deleted folders. |
| `package.json` scripts `deploy`, `deploy:dev`, `dev:lane`, `sync:*` | The deploy script targeted upstream's Netlify site. |

**Kept although the plan listed them**
| Path | Why |
|---|---|
| `src/components/LinkThreads.tsx`, `link-threads.css` | The plan lists them under S4, but they draw the red string between flow cards (`convex/links.ts`), not Firecrawl links. Restored. |
| `src/pages/labs.css` | `Admin.tsx` imports it for the `admin-lab` styles. |
| `convex/photos.ts` | Photo uploads for the memory wall and avatars. Only its crew-photo backfill was removed. |
| `convex/work.ts`, `useSpaceWork.ts`, `SpaceLiveStrip` | Generic work log; nothing writes to it yet. Kept for receipts/s�ance narration. |
| `src/components/MailArrival.tsx`, `src/lib/mailArrival.ts` | Kept for F6 (sealed letters). Trimmed to the stage component; nothing feeds it. |
| `@convex-dev/action-retrier`, `workflow`, `workpool`, `presence` mounts | Listed as keepers in the strip plan. |

**Changed**
- `convex/openrouter.ts` also exports `completeJsonWithUsage`, `pingOpenRouter`, `chooseLetter`, `parseJsonObject` and an internal `routes` action.
- `convex/tables/after.ts` was created in P1 with only `modelCalls` (the metrics table). The rest of the plan's tables arrive with their features.
- `convex/guard.ts` model keys are tiers (`fast`, `mid`, `vision`), not model names. `noteSpend` takes optional `job` and `ms` and writes the `modelCalls` row.
- `SPEND_CEILING_USD` is 1 (the plan's starting value).
- `createSpace` is open to guests everywhere (`roomsOpen` always true): with email codes gone, gating it on a registered account would leave only Google users able to make a space.
- The demo space is now `coven` (wren, theo, priya, dante, juno, kai); `DEFAULT_SPACE_SLUG` is `coven`. The mock-mode fixtures (`src/data/spaces.ts`, `chat.ts`, `roomKnows.ts`, `games.ts`, `jigsaw.ts`, `recap.ts`) and `convex/seed.ts` were rewritten around it. Seed helpers for the old house/crew/family rooms were removed.
- Upstream names in comments, examples and prompt fixtures were mapped to the coven cast (Maya to Wren, Jules to Theo, Sam to Priya, Rio to Dante, Kenji to Juno, Ash to Kai, Thomas to Wren, Holly to Theo).
- `src/pages/About.tsx` is a placeholder until the P2 rewrite.
- `README.md` is a short placeholder with the "Built on" section; P5 rewrites it.
- `netlify.toml` no longer points at upstream's Convex deployment; set our own in P5.
- Dev-lane detection now reads `VITE_DEV_LANE=1` instead of upstream's deployment name.
- `package.json` gained `typecheck` and `lint` scripts (oxlint).
- Convex codegen could not run here (`convex dev --once` stalls downloading the local backend), so `convex/_generated/api.d.ts` and the `Env` type in `server.d.ts` were edited by hand. Run `npx convex dev` once on a real deployment to regenerate them.

**Still to do in later phases**
- `.github/devpost/` holds upstream marketing screenshots; replace or delete in P5.
- `public/assets/` still holds upstream art (stickers, space covers, link-card art, textures); P2 replaces it.
- `convex/paint.ts` has a self-heal for the old "couple" room; delete when cozy-color is reworked or cut.
- `src/index.css` still carries CSS for removed cards (reading room, build room, link read). Prune during the P2 restyle.

## P2 as built (P2.1-P2.4, P2.6; deviations from the P2 list)

**Created**
| Path | Why |
|---|---|
| `src/styles/board.css` | Board surface: grain (inline SVG noise, `--as-grain`), our torn-paper shape (`--as-torn-paper`), fog + vignette on `main.paper-bg`, focus rings. |
| `src/styles/cards.css` | Card frames, silhouettes, pins, tape. Override sheet instead of editing ~60 per-type rules in `index.css`. |
| `src/styles/layout.css` | Profile header band, tab strip, crystal-ball bar, demo ribbon, cursor name tags. |
| `src/styles/pages.css` | Guestbook gate, welcome page, grimoire book, shared `.as-btn` buttons. |
| `public/ui/placeholder-photo.svg` | Our photo placeholder (replaces `public/assets/placeholder-photo.svg`). |

All four sheets load from `src/main.tsx` after `index.css`. Tokens and fonts stay in the `index.css` `@theme` block.

**Modified beyond the list**
| Path | Change |
|---|---|
| `src/components/Canvas.tsx` | `SpaceHeader` now renders `ProfileHeader`. The old "a live shared board..." line was dropped (the mood line replaces it). |
| `src/components/LinkThreads.tsx`, `link-threads.css` | The red string is drawn here (`flowMarks.tsx` draws no lines). Lines became sagging `<path>`s. |
| `src/components/ClaimCard.tsx` | The first-visit gate is `ClaimCard` (`variant="gate"`), not `JoinForm`. It got the "sign in to the page" title. `JoinForm.tsx` and `LookRow.tsx` are restyled by CSS only. |
| `src/cursors/styles.tsx` | Default cursor (`ClassicArrow`) is a planchette. Name tags use `--cursor-color` instead of a coloured fill. |
| `src/components/CanvasEdgePan.tsx`, `src/lib/canvasSpacePan.ts`, `src/App.tsx`, `src/pages/LiveSpace.tsx` | `.space-rail` became `.space-tabs`. The focus camera now treats the tabs as a top inset instead of a left one. |
| `src/data/spaceThemes.ts` | Default theme is `nightwall` ("night plum", `#1b1220`). |
| `src/components/SpaceLiveStrip.tsx`, `ActionDock.tsx`, `DemoBanner.tsx`, `PhotoWallGallery.tsx`, `src/widgets/extras.tsx`, `src/pages/Admin.tsx` | Copy table. |

**Not done or done differently**
- `ActionDock.tsx`, `VoiceOrb.tsx`, `voice-stage.css` and `orbHint.css` are unchanged. The dock seat shows `public/ui/crystal-ball.png` (CSS). The WebGL orb is hidden in the seat and still lights the open ask stage.
- Join looks are a 4×2 sticker sheet, not 6×2. There are only 8 personas (`PERSONA_NAMES`). Twelve needs 4 more persona names in `src/live/identity.ts` mapped to `look-01..12`.
- The welcome page is at `#/welcome` (and still `#/test`). A bare `#/` keeps opening the coven, because changing the default route would change the demo flow. "Make your own" goes to the coven and fires `MAKE_SPACE_EVENT`.
- Top 8 is a placeholder from the space roster. The visitor counter reads the local demo count (`src/lib/onboarding.ts`). The song button is an inert slot. All three are P3.
- The poll is not drawn as candles yet (it uses pumpkin bars and a candle pin). The countdown's tear-off strip is hidden on the tombstone.
- The buddy list is not built, so the "N haunting now" pill and the live strip stay. The strip moved to `left: 20px`.
- Sounds were not swapped (P2.6 sound part is still open).
- `About.tsx` and `Me.tsx` were not rewritten.

**`public/assets/` cleanup**
- Deleted: all upstream stickers (including the blue `hello-cat`), `space-covers/`, `link-card-*`, `coloring-concepts/`, `textures/*`, `ui/quote-pushpin.png`, `ourspace-mark.png`, `placeholder-photo.svg` and `cozy-color-same-moon-colored.png`.
- The sticker catalog (`src/data/stickers.ts`) now uses our mascots and UI art under new ids. A stored sticker row with an old id renders nothing.
- The upstream hosted texture (`asset.mmm.page/...png`) is replaced by `--as-grain` everywhere.
- Still upstream: `cozy-color-same-moon.png`, `cozy-color-poster.svg`, `cozy-poster-starry.svg`, `cozy-poster-wave.svg`. They belong to the paint-by-number card (`widgetDefaults.ts`, `convex/paint.ts`, `cozyColorBoards.ts`, `boards/*.ts`). Redraw them or cut that card.
- The old `.welcome-*` rules in `index.css` are now unused. Prune them with the other dead CSS.
