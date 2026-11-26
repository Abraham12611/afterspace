import { RateLimiter, MINUTE, DAY } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * rate-limiter component: per-space token-bucket quotas on the paths that
 * cost real money or hit a free-tier cap (LLM calls) plus
 * a per-user quota on the highest-frequency write (paint strokes). Mostly keyed
 * by space rather than user, because a client-supplied userId is not a
 * trustworthy key (§1) — a space-scoped quota still protects spend and the
 * quota from a runaway loop or a single bad actor.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // "spark" conversation-starter generation (questions.ts) and the recap
  // "catch me up" / "ask" actions (recap.ts) all call the LLM proxy.
  sparkQuestions: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  recapAsk: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  recapGenerate: { kind: "token bucket", rate: 3, period: MINUTE, capacity: 3 },
  // Per-user: a stroke lands once per completed drag, not per point, so this
  // is generous headroom for normal drawing while still bounding abuse.
  paintStroke: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 20 },
  /* The model door, the voice orb (convex/guard.ts).
     Keyed by the caller's seat, which the session proves, so these can be per
     person. One ask is about a dozen calls (≤6 speculative fills, the final
     fill, 3–4 decides): the burst covers five asks back to back, the refill
     an ask every ~15s all day. */
  voicePerson: { kind: "token bucket", rate: 50, period: MINUTE, capacity: 60 },
  /* Per room per day: 300 calls ≈ 30–60 asks ≈ $0.08–0.27 (b2-wired §e: a
     fast ask ≈ $0.0021 over ~8 calls, a brain ask ≈ $0.0045 over ~5). */
  // sharded: everyone asking in one room shares this row, and a busy minute shouldn't queue on one document
  voiceRoomDay: { kind: "fixed window", rate: 300, period: DAY, shards: 5 },
  // The orb's wake-up ping costs nothing, but it is not an open relay.
  voiceWarm: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 6 },
});

/**
 * The deployment's daily model-spend ceiling (convex/guard.ts): estimated
 * dollars (tokens × list price) across every room, per UTC day. Past it the
 * voice orb stops calling the model and says so; what code answers alone
 * (edits, answers from the room's facts, cards filled from answers) still
 * works. Keep the OpenRouter key's own credit limit low as a second fence.
 */
export const SPEND_CEILING_USD = 1;

/** List price, USD per million tokens, per model tier (convex/ai.ts MODELS; openrouter.ai/api/v1/models). */
export const PRICE_PER_M = {
  fast: { prompt: 0.15, completion: 0.6 }, // openai/gpt-4o-mini
  mid: { prompt: 0.4, completion: 1.6 }, // openai/gpt-4.1-mini
  vision: { prompt: 0.4, completion: 1.6 }, // openai/gpt-4.1-mini
} as const;
