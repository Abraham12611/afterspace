# Env and deploy

## Convex env vars (set with `npx convex env set NAME value`)
| Var | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | no (canned AI without it) | All model calls |
| `SITE_URL` | yes | Auth redirects, OpenRouter `HTTP-Referer` |
| `JWT_PRIVATE_KEY`, `JWKS` | yes | Convex Auth (generate per Convex Auth docs) |
| `ADMIN_KEY` | yes | Demo reset / fast-forward |
| `SPEND_CEILING_USD` | no (default 1.00) | Daily AI budget |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | no | Optional Google sign-in |
Removed: `AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`, `FIRECRAWL_API_KEY`, `FIRECRAWL_WEBHOOK_SECRET`,
`TAVILY_API_KEY`, `NEBIUS_API_KEY`, `AI_GATEWAY_DISABLED`.

## Frontend `.env.local`
`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL` (written by `npx convex dev`). Nothing secret.

## Deploy
- Backend: `npx convex deploy` to a production deployment.
- Frontend: Netlify (upstream `netlify.toml`) or Convex static hosting (`npm run deploy:convex`). Pick one in
  phase 5; Netlify is the default.
- Public demo URL goes in the README and Devpost.

## Demo data
- `#/admin` with `ADMIN_KEY`: reset the demo spaces to their seeded state; fast-forward a space's pet to
  hungry / fading / dead; mark a member away for 2 days (for the séance).
- Seeded spaces: **the coven** (6 friends, main demo), **the crypt** (pet already dead, for revive),
  **long distance** (2 people, paint + letters).
