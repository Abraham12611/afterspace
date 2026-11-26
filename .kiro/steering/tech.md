# Tech

## Stack
- Frontend: Vite, React 19, TypeScript, Tailwind CSS v4 (inherited from the fork).
- Backend: Convex (database, reactive queries, mutations, actions, scheduler, crons, HTTP actions, Convex Auth).
- AI: OpenRouter only, through one module `convex/openrouter.ts` (OpenAI-compatible
  `https://openrouter.ai/api/v1/chat/completions`). Model ids live in one constant map in `convex/ai.ts`.
  Without `OPENROUTER_API_KEY`, AI features return canned output so the demo never breaks.
- Voice: browser Web Speech API; typed input uses the same path.
- Tests: Vitest (`vitest --run`) and fast-check for property-based tests.

## Removed from the fork (never reintroduce)
AgentMail, email OTP sign-in, Nebius / NVIDIA Nemotron, Tavily, Firecrawl, RAG / vector embeddings,
the `@convex-dev/agent` component, and the upstream labs, reels, pilot and eval code.

## Rules
- Pure logic lives in `src/lib/` with no React, no Convex, no clock, no network. Each new pure module gets a
  `.test.ts` next to it, with property tests for its invariants.
- The model only fills card ids and settings from the catalog. Code validates fields, places cards,
  and resolves names to real members.
- Every Convex function validates args with `v.*`. Derive the caller's seat from the session, never from args.
- Secrets only in Convex env vars. Never in code, logs, or `VITE_*` variables.
- Every model call goes through the spend guard (daily USD ceiling) and the per-seat rate limit.
- Uploaded images (receipts) are size- and type-checked before any model call.

## Commands
- `npm run dev` frontend, `npx convex dev` backend.
- `npm test` runs Vitest once. `npm run typecheck` runs `tsc -b --noEmit`. `npm run lint` runs oxlint.
