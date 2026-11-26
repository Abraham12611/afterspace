# Strip plan

Work in this order. After each step: `npm run typecheck`, `npx convex dev --once`, open the app.
Fix by deleting the caller's dependent feature, or by replacing the call with a stub, never by
re-adding the removed module. Each step is one commit: `strip: <step>`.

## S1. AgentMail + email OTP
Delete:
- `convex/agentmail.ts`, `convex/inbox.ts`, `convex/inboxRouting.ts`, `convex/mailArrival.ts`
- `convex/otp.ts`, `convex/emails/`
- `convex/components/agentMail/` (local component)
- `src/pages/MailReel.tsx`, `mailReel.css`, `MailLabBar.tsx`
- `src/lib/mailLabCake.ts`, `src/lib/mockArrival.ts`
Edit:
- `convex/convex.config.ts`: remove the `agentMail` mount and `AGENTMAIL_*` env declarations.
- `convex/http.ts`: remove `/api/agentmail/webhook`.
- `convex/auth.ts`: remove `EmailOtp` from providers and the OTP branch; keep Anonymous + optional Google.
- `src/live/useJoin.ts`, `JoinForm.tsx`: remove the "join with email code" path.
- `convex/spaces.ts`, `admin.ts`, `crons.ts`, `digest.ts`, `rateLimits.ts`: remove inbox fields, mail crons,
  mail limits.
- `convex/tables/mail.ts`: drop `emailEvents`; keep `work`, `recaps`, `askStreams` only if still used.
- `src/data/spaces.ts`, `src/data/types.ts`: remove inbox address fields.
Keep but rework later: `src/lib/mailArrival.ts` + `src/components/MailArrival.tsx` (sealed letters, F6).

## S2. Nebius / Nemotron → OpenRouter
- Create `convex/openrouter.ts` (see openrouter.md) with the same exported shape `nebius.ts` gives its callers
  (`streamChat`, `chatTarget`, a JSON helper) so callers change only their import.
- Rewrite the model map in `convex/ai.ts` (`NEMOTRON_BY_JOB` → `MODEL_BY_JOB`).
- Update imports in: `voiceBuild.ts`, `recap.ts`, `questions.ts`, `games.ts`, `roomBrief.ts`, `guard.ts`,
  `choiceVotes.ts`, `seat.ts`, `widgets.ts`, `spaces.ts`, `leases.ts` (many may only mention Nemotron in comments;
  fix comments too).
- Remove Nemotron-only request fields: `chat_template_kwargs.enable_thinking`.
- `voiceBuild.decide` uses one-token logprobs. Keep it only if the chosen model supports logprobs on OpenRouter;
  otherwise replace with a short JSON answer `{"card":"poll","exists":false}`.
- Delete `convex/nebius.ts`. Update client mentions: `OrbHint.tsx`, `NewRoom.tsx`, `LookupTick.tsx`, `About.tsx`.

## S3. Tavily
Delete `convex/tavily.ts`, `src/components/LookupReceipt.tsx`, `LookupTick.tsx`.
Edit `convex.config.ts` (env), `edits.ts`, `voiceBuild.ts` (remove `noteCommitted` lookup scheduling),
`rateLimits.ts`, `seed.ts`, `widgetData.ts` (lookup fields), `RightOfWay.tsx`, `VoiceBuildLayer.tsx`,
`useLiveHandlers.ts`, `useVoiceBuild.ts`, `LiveSpace.tsx`, `widgets/core.tsx`, `linkRead.tsx`, `webPic.tsx`.

## S4. Firecrawl + build room + link cards (decision O1)
Delete `convex/firecrawl.ts`, `convex/batch.ts`, `src/components/CrawlStrip.tsx`, `ReadingRoom.tsx`,
`LinkReadReceipt.tsx`, `LinkThreads.tsx`, `LinkQuestionStrip.tsx`, `ShipRoom.tsx`, `src/widgets/buildroom.tsx`,
`linkRead.tsx`, `webPic.tsx`, `src/lib/buildRoomFeed.ts`, `buildRoomPresentation.ts`, `linkQuestions.ts`,
`linkRanking.ts`, `src/data/buildroom.ts`, `src/pages/FirecrawlReel.tsx`, `ArrivalLab.tsx`.
Edit `convex.config.ts` (firecrawl mount + env), `guard.ts`, `rateLimits.ts`, `admin.ts`, `widgetData.ts`
(link types), `WidgetEditorPanel.tsx`, `useLiveHandlers.ts`, `useSpaceWork.ts`, `LiveSpace.tsx`, `WidgetCard.tsx`
(remove the link cases), `src/data/types.ts` (remove cut types).
Remove `@firecrawl/firecrawl-convex` from `package.json`.

## S5. RAG, agent, similarity, streaming
Delete `convex/rag.ts`, `convex/agent.ts`, `convex/similar.ts`; `convex/streaming.ts` unless the séance streams.
Edit `convex.config.ts` (remove `agent`, `rag`, `persistentTextStreaming` if unused), `widgets` table
(drop `embedding`, `embeddedText`, vector index), `http.ts` (`/api/ask-stream` if cut).
Remove packages: `@convex-dev/agent`, `@convex-dev/rag`, `@convex-dev/ai-sdk-provider`, `@ai-sdk/*`, `ai`
(only if nothing else imports them).

## S6. Upstream labs, reels, pilot, eval, docs
Delete `src/pages/CodexReel.tsx`, `codexReel.css`, `firecrawlReel.css`, `Outro.tsx`, `outro.css`, `ColorLab.tsx`,
`CursorLab.tsx`, `WidgetLab.tsx`, `WidgetWall.tsx`, `LiveBlock.tsx`, `Block.tsx`, `labs.css`;
`src/components/PlayLab.tsx`; `convex/pilot.ts`, `harness.ts`, `playLab.ts`, `shootReset.ts`;
`src/lib/rowMock.ts`, `src/live/labPeers.ts` (if only labs use them);
`eval/`, `docs/` (upstream), `hackathon.md`, `DESIGN.md`, `.claude/`, `.agents/`, `skills-lock.json`, `.github/readme/`.
Edit `src/App.tsx`: remove the lab/reel routes listed in sitemap.md.

## S7. Personal data and assets
- Replace every upstream demo space and person in `convex/seed.ts` with our own fictional cast. Upstream's
  family room uses real people (Thomas, Holly, Hoa, Hoang, Bumi the dog per its README): remove it entirely.
  Upstream's crew names (maya, jules, sam, rio, kenji, ash) are recognizable from its demo: replace them too.
  New cast for the coven: wren, theo, priya, dante, juno, kai.
- Delete `public/photos/`, `public/avatars/`, `public/demo-video-assets/`; add our assets.
- Remove `src/data/family.ts`, `family.css` if they carry the real family room.

## S8. Flappy (decision O2), backendLive, weather/sports (if keyed)
Delete `src/components/games/Flappy.tsx`, `flappy.css`; remove `backendLive` card and `stats.ts` show-off
queries only if nothing else uses them.

## S9. Green build
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- `npx convex dev` starts with only `OPENROUTER_API_KEY` set (and without it, with canned AI).
- Manual: U1, U2, U3 (canned), U4 from user-flows.md.
- Update `04-build/file-manifest.md` with anything deleted that isn't listed here.

## Components mounted after the strip
Keep: `staticHosting`, `authWellKnown`, `migrations`, `aggregate` (pollTallies, memberCounts), `shardedCounter`,
`rateLimiter`, `actionRetrier`, `workpool`, `workflow` (if the séance uses it), `presence` (only if used; upstream
mounts it but uses its own table, so likely remove).
Remove: `agentMail`, `firecrawl`, `actionCache` (if only Firecrawl used it), `batchWorker`, `agent`, `rag`,
`persistentTextStreaming` (unless kept).
