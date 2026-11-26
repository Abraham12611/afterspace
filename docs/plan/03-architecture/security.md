# Security

## Trust boundaries
| Boundary | Rule |
|---|---|
| Browser → Convex | Every function validates args with `v.*`. The caller's member seat comes from the auth session (`seatOf`), never from args |
| Convex → OpenRouter | Key only in Convex env. Output is untrusted: parsed, validated against the card schema, names resolved to real members, unknown fields dropped |
| User text → prompts | Cut to length (ask 240 chars, letters 2,000). Never put another space's data in a prompt |
| Uploads (receipts, photos) | Type allowlist (jpg/png/webp), 5 MB max, stored in Convex storage, served by URL scoped to the space |
| Admin | `ADMIN_KEY` checked server-side; admin functions are `internal` behind one checked entry |

## Access
- A member can only read and write spaces they're a member of.
- Letters: only addressees can read the text before and after opening; others see only "sealed letter to theo".
- Leaving a space removes the seat; their cards stay, authored by name.

## Abuse and cost
- Daily AI spend ceiling, per-seat and per-space limits (openrouter.md).
- Presence send throttle (50 ms) stays; heartbeat TTL 30 s.
- Space slugs are unguessable for non-demo spaces (random suffix).

## Privacy
- No real personal data in seeds or assets.
- `modelCalls` logs metrics only, never prompt or letter text.
