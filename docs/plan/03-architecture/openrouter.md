# AI on OpenRouter

## Endpoint
- `POST https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible).
- Headers: `Authorization: Bearer ${OPENROUTER_API_KEY}`, `Content-Type: application/json`,
  optional `HTTP-Referer: ${SITE_URL}` and `X-Title: Afterspace` (app attribution).
- Streaming: `stream: true` returns server-sent events like OpenAI's.
- Images: user message content parts `{type: "image_url", image_url: {url: "data:image/jpeg;base64,..."}}`
  on vision-capable models.
- Verify before coding (phase 1.2): JSON mode / `response_format` support, `logprobs` support, and how usage
  and cost are reported, per chosen model. Check https://openrouter.ai/docs.

## `convex/openrouter.ts` (the only file that calls a model)
Exports:
- `chatTarget(job)`: returns `{model, maxTokens}` or `null` if no key (callers then use canned output).
- `streamChat({job, messages, onDelta})`: streamed text, temperature 0 by default.
- `completeJson({job, system, user, images?})`: one non-streamed call, parses JSON, returns `null` on any failure.
- Every call goes through `guard.spend` (daily USD ceiling) and the per-seat limiter before the fetch.
- Every call logs `{job, model, ms, inputTokens, outputTokens, usd}` (no prompt text) to a `modelCalls` table
  for the write-up's numbers.

## Jobs and model tiers (`convex/ai.ts MODEL_BY_JOB`)
| Job | Needs | Tier |
|---|---|---|
| `deal` (fast: plain asks) | Low latency, short JSON lines | fast, small model |
| `deal` (brain: asks that need group facts, multi-card) | Better instruction following | mid model |
| `decide` (which card) | One short answer | fast |
| `recap` / séance | Short prose, citations | mid |
| `questions` (question of the day) | Short prose | fast |
| `epitaph` | One funny sentence | fast |
| `receipt` | Vision + JSON | vision model |
Pick concrete model ids in phase 1.2 from openrouter.ai/models by price, latency and support for the needs
above. Keep them as constants so swapping is one line.

## Canned fallbacks (no key, over budget, or model error)
| Job | Fallback |
|---|---|
| deal | Rule-based parse for poll, countdown, checklist, note (keyword + quoted text) |
| decide | Keyword match against catalog `use` lines |
| recap/séance | Template lines from activity counts ("3 new votes on dinner") |
| epitaph | Pick from 20 canned epitaphs |
| receipt | Manual entry form |

## Budget
- `SPEND_CEILING_USD` per UTC day (start at 1.00).
- Per seat: 30 asks/min, burst 40. Per space per day: 300 model calls.
- Receipts: 20 per space per day.
