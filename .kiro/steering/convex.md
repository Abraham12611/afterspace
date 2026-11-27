---
inclusion: fileMatch
fileMatchPattern: ['convex/**']
---
# Convex rules (applies to backend files)

- Every query, mutation and action declares `args` with `v.*` validators (and `returns` where the file already does).
- Never trust an id or name from the client for authorship or access. Get the caller's seat with `seatOf`
  (`convex/seat.ts`) and check membership of the space before reading or writing.
- Functions only other functions call are `internalQuery` / `internalMutation` / `internalAction`.
- Actions never write the database directly; they call a mutation. Model calls happen only in actions, only through
  `convex/openrouter.ts`, and only after the spend guard (`convex/guard.ts`) and rate limits (`convex/rateLimits.ts`).
- AI writes to existing cards go through the Right of Way door (`convex/rightOfWay.ts`) inside the committing
  mutation. Never bypass it.
- New tables go in `convex/tables/after.ts` and are spread into `convex/schema.ts`. Add indexes for every query
  pattern; never `.filter()` a full table scan on a hot path.
- Secrets come from Convex env vars (`npx convex env set`). Never log prompts, letters or keys.
- After schema or function changes, `npx convex dev --once` regenerates `convex/_generated` (commit it).
