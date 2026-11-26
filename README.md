# Afterspace

MySpace died. Your friends' space shouldn't have. Afterspace is a live, shared page for a friend group,
stitched from the bones of the old web: Top 8, a profile song, a buddy list with away messages, a pet that
lives on your page, a spirit board for decisions, and letters that arrive sealed.

Kiroween 2026, category Frankenstein. The plan lives in [`docs/plan/`](docs/plan/README.md).

> Work in progress. This commit is the strip phase: the upstream app with its removed services
> (email, link scraping, web lookups, vector search, agent threads) cut out and the AI moved to OpenRouter.

## Built on

Afterspace is a disclosed fork of [OurSpaces](https://github.com/thomasnguyen/ourspaces-app) by Thomas Nguyen
(MIT), imported at upstream commit `45bebcbeb7474e3e30f403b2f8e466e7bdc07304`. The first commit in this repo
(tag `upstream-import`) is that import, unmodified. Every later commit is our work, so the diff from that
commit is what was built during the submission period. See
[`docs/plan/00-overview/provenance.md`](docs/plan/00-overview/provenance.md).

## Run it

```
npm install
npm run dev          # frontend
npx convex dev       # backend
npm test             # once the test setup lands (P0.5)
npm run typecheck
npm run lint
npm run build
```

On your Convex deployment, `OPENROUTER_API_KEY` is optional: without it every AI feature returns canned
output. `SITE_URL`, `ADMIN_KEY`, and the Google sign-in keys (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) are
optional too. Guests sign in anonymously.

## Stack

Vite, React 19, TypeScript, Tailwind v4, Convex, OpenRouter (`convex/openrouter.ts`; models in `convex/ai.ts`).

## License

MIT. See [`LICENSE`](LICENSE): the upstream copyright line stays, ours is added below it.
