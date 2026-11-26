# Inherited features: keep, reskin, or cut

Legend: **Keep** = works as is, restyle only. **Reskin** = keep logic, change look/copy/position.
**Rework** = keep the core, change behavior. **Cut** = delete code.

## Core platform
| Feature | Upstream files | Verdict | Notes |
|---|---|---|---|
| Live board (pan/zoom canvas, cards, drag, resize) | `src/components/Canvas.tsx`, `WidgetCard.tsx`, `convex/widgets.ts`, `convex/spaces.ts` | Reskin | New card frames and board surface |
| Presence + named cursors | `convex/presence.ts`, `roomPresence.ts`, `src/live/usePresence.ts`, `src/cursors/` | Rework | Becomes the buddy list + away messages + door sound |
| Anonymous guest join | `convex/auth.ts` (Anonymous), `JoinForm.tsx`, `useJoin.ts` | Reskin | "Sign in" becomes "step inside" |
| Email OTP sign-in | `convex/otp.ts`, `convex/emails/` | Cut | Sent through AgentMail |
| Google sign-in | `convex/auth.ts` | Keep (optional) | Only if keys are set |
| Spaces list rail | `src/components/Rail.tsx` | Reskin | Moves; see layout-changes.md |
| Create a space | `NewRoom.tsx`, `SpaceMaker.tsx`, `useCreateSpace.ts` | Reskin | New templates (coven, house, trip, league) |
| Space settings | `SettingsSheet.tsx`, `SpaceEditorPanel.tsx` | Reskin | Adds skin, song, pet name |
| Card picker | `WidgetPicker.tsx` | Reskin | New categories, hides cut cards |
| Card editor | `WidgetEditorPanel.tsx` | Keep | Remove link/crawl fields |
| Per-card threads + global chat | `messages.ts`, `WidgetThreadDock.tsx`, `GlobalChatPanel.tsx` | Reskin | Global chat restyled as a buddy chat window |
| Right of Way (holds, ghosts, undo) | `src/lib/rightOfWay.ts`, `convex/rightOfWay.ts`, `leases.ts`, `RightOfWay.tsx` | Keep | Reskin halos as candle glow. Add property tests |
| Choice votes ("ask the people who chose") | `choiceVotes.ts`, `ChoiceVote.tsx` | Keep | |
| Voice / typed ask (orb) | `voiceBuild.ts`, `useVoiceBuild.ts`, `VoiceOrb.tsx`, `VoiceStage.tsx`, `src/lib/deck/*` | Rework | Model calls move to OpenRouter; orb becomes a crystal ball |
| "What this space knows" | `RoomKnows.tsx`, `roomBrief.ts` | Reskin | Renamed "the grimoire" |
| Recap / digest | `recap.ts`, `digest.ts` | Rework | Becomes the séance |
| Daily questions | `questions.ts` | Keep | Model moves to OpenRouter |
| Activity + stats | `activity.ts`, `stats.ts` | Keep | Feeds the pet and Top 8 |
| Rate limits + spend guard | `rateLimits.ts`, `guard.ts` | Rework | Remove Tavily/Firecrawl/mail limits; price table for OpenRouter |
| Admin reset + seed | `admin.ts`, `seed.ts`, `shootReset.ts` | Rework | New fictional demo data; remove their family data |
| Static hosting / Netlify | `staticHosting.ts`, `netlify.toml` | Keep | |
| Avatar upload | `useAvatarUpload.ts`, `avatarPhoto.ts` | Keep | |
| Photos | `photos.ts`, `PhotoWallGallery.tsx` | Keep | |
| Paint together (cozy color) | `paint.ts`, `CozyColorWidget.tsx` | Keep | Decision O3 |
| Games: hot seat, jigsaw | `games.ts`, `puzzles.ts`, `components/games/*` | Keep | Decision O2 |
| Game: flappy | `components/games/Flappy.tsx` | Cut | Decision O2 |
| Challenges + check-ins | `challenge.tsx`, `checkIns.ts` | Keep | |
| Linked cards ("flows") | `links.ts`, `flowMarks.tsx` | Keep | Drawn as red string |

## Integrations
| Feature | Verdict | Replacement |
|---|---|---|
| AgentMail inbox per space, inbound mail, replies | Cut | Sealed letters in-app (features-new.md F6) |
| Mail-to-split receipts | Cut | Receipt photo to split (F7) |
| Mail arrival animation (`MailArrival.tsx`) | Rework | Reused for sealed-letter delivery |
| Nebius / Nemotron | Cut | OpenRouter |
| Tavily place lookups | Cut | None (polls take typed options) |
| Firecrawl link reading, build room, link pile, hot links, ship post, roundtable | Cut | Decision O1 |
| RAG search, `@convex-dev/agent` "ask the space", similar/echo check | Cut | Séance uses the room brief directly |
| Persistent text streaming | Keep if séance streams; else cut | |
| Radio card (Radio Paradise now-playing) | Rework | Becomes the y2k player (F3) |

## Upstream-only material
| Item | Verdict |
|---|---|
| `src/pages/*Lab.tsx`, `*Reel.tsx`, `Outro.tsx`, `WidgetWall.tsx`, `LiveBlock.tsx`, `Block.tsx` | Cut |
| `convex/pilot.ts`, `harness.ts`, `playLab.ts` | Cut |
| `eval/`, `docs/`, `hackathon.md`, `DESIGN.md`, `.claude/`, `.agents/`, `skills-lock.json`, `.github/readme/` | Cut |
| `public/photos/`, `public/avatars/`, `public/demo-video-assets/` | Cut and replace with our assets |
| `README.md` | Rewrite |
