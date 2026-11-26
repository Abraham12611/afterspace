# Decisions

## Made
| # | Decision | Why |
|---|---|---|
| D1 | Name: Afterspace | Afterlife of MySpace; reads as a real product |
| D2 | Category: Frankenstein | The old-web-stitched-to-live-tech story fits it best |
| D3 | Fork OurSpaces, disclosed | Fastest path; rules allow it with disclosure and license compliance |
| D4 | AI: OpenRouter only | One key, any model; replaces Nebius/Nemotron |
| D5 | Remove AgentMail entirely | No per-space email. Letters and receipts move in-app |
| D6 | Remove email OTP sign-in | It sent codes through AgentMail. Keep anonymous guest + optional Google |
| D7 | Remove Tavily, Firecrawl, RAG embeddings, `@convex-dev/agent` | Fewer keys, less code, nothing in the demo needs them |
| D8 | Remove upstream labs, reels, pilot, eval, docs, `.claude/`, `.agents/` | Their process artifacts, not product |
| D9 | Hash routing stays | Changing routers costs a day for no visible gain |
| D10 | Trademark-safe feature names | Rules forbid third-party trademarks in the video |

## Open (default in bold; change it here if you disagree)
| # | Question | Options |
|---|---|---|
| O1 | Keep link cards (needs a reader)? | **Cut for MVP** / rebuild later with a plain fetch + OpenRouter summary |
| O2 | Keep games (hot seat, flappy, jigsaw)? | **Keep jigsaw + hot seat, cut flappy** / cut all |
| O3 | Keep paint / cozy color? | **Keep** (it's the long-distance demo) / cut |
| O4 | Google sign-in | **Off by default**, on if keys are set |
| O5 | Startup bonus | **Enter** if you'll set up a website + LinkedIn by Dec 3 |
| O6 | Default models on OpenRouter | Pick in phase 1.2 after checking openrouter.ai/models for price, latency, JSON and vision support |
| O7 | Domain | afterspace.* availability not checked yet |
