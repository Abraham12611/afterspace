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
