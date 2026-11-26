import { ConvexError, v } from "convex/values";
import { ShardedCounter } from "@convex-dev/sharded-counter";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { rateLimiter, PRICE_PER_M, SPEND_CEILING_USD } from "./rateLimits";
import { seatOf, seatOrMaker } from "./seat";
import { MODELS, type AiJob, type ModelTier } from "./ai";

/**
 * The door in front of every model call a browser can start. One mutation, before the model is called: the
 * caller has a seat in the room (from the session, never an argument), the
 * person's burst and the room's day have room for these calls, and the
 * deployment hasn't passed its day's ceiling. The numbers live in
 * convex/rateLimits.ts.
 *
 * Refusals are plain values the asker's screen turns into a line:
 * "limit" → "that's a lot of asks; try again in a minute", "spent" → the
 * model is off for today. No seat throws: no member's screen ever sees it.
 */

/** Estimated spend, per UTC day: `tf-micro:<day>` (micro-dollars) and `tf-calls:<day>`. */
const spend = new ShardedCounter(components.shardedCounter, { defaultShards: 4 });
const today = () => new Date().toISOString().slice(0, 10);

export type Usage = { prompt_tokens?: number; completion_tokens?: number } | null | undefined;

/** Micro-dollars for one call: tokens × list price. */
export function microsOf(model: ModelTier, usage: Usage): number {
  const price = PRICE_PER_M[model];
  return Math.ceil((usage?.prompt_tokens ?? 0) * price.prompt + (usage?.completion_tokens ?? 0) * price.completion);
}

async function spentToday(ctx: QueryCtx) {
  const day = today();
  const [micros, calls] = await Promise.all([spend.count(ctx, `tf-micro:${day}`), spend.count(ctx, `tf-calls:${day}`)]);
  return { day, usd: micros / 1e6, calls };
}

/** One finished call: the tier it ran on, its token usage, and (for the metrics row) which job and how long. */
export type SpendCall = { model: ModelTier; usage: Usage; job?: AiJob; ms?: number };

/** Count calls that happened (from an action, after the model answered). Calls
 * that name a job also leave a `modelCalls` row (metrics only, no text). */
export async function noteSpendIn(ctx: MutationCtx, calls: SpendCall[]) {
  if (!calls.length) return;
  const day = today();
  const micros = calls.reduce((sum, c) => sum + microsOf(c.model, c.usage), 0);
  await spend.add(ctx, `tf-calls:${day}`, calls.length);
  if (micros) await spend.add(ctx, `tf-micro:${day}`, micros);
  const at = Date.now();
  for (const c of calls) {
    if (!c.job) continue;
    await ctx.db.insert("modelCalls", {
      job: c.job,
      model: MODELS[c.model],
      ms: c.ms ?? 0,
      inTok: c.usage?.prompt_tokens ?? 0,
      outTok: c.usage?.completion_tokens ?? 0,
      usd: microsOf(c.model, c.usage) / 1e6,
      at,
    });
  }
}

const tierValidator = v.union(v.literal("fast"), v.literal("mid"), v.literal("vision"));
const jobValidator = v.union(
  v.literal("deal"), v.literal("brain"), v.literal("decide"), v.literal("ask"), v.literal("recap"),
  v.literal("questions"), v.literal("epitaph"), v.literal("game"), v.literal("receipt"),
);

export const noteSpend = internalMutation({
  args: { calls: v.array(v.object({ model: tierValidator, prompt: v.number(), completion: v.number(), job: v.optional(jobValidator), ms: v.optional(v.number()) })) },
  returns: v.null(),
  handler: async (ctx, { calls }) => {
    await noteSpendIn(ctx, calls.map((c) => ({ model: c.model, job: c.job, ms: c.ms, usage: { prompt_tokens: c.prompt, completion_tokens: c.completion } })));
    return null;
  },
});

/** Today's count and estimate (`npx convex run guard:day`). */
export const day = internalQuery({
  args: {},
  returns: v.object({ day: v.string(), usd: v.number(), calls: v.number(), ceilingUsd: v.number() }),
  handler: async (ctx) => ({ ...(await spentToday(ctx)), ceilingUsd: SPEND_CEILING_USD }),
});

export const gateResult = v.union(
  v.object({ ok: v.literal(true), userId: v.string(), name: v.string(), dealId: v.union(v.id("deals"), v.null()) }),
  v.object({ ok: v.literal(false), why: v.union(v.literal("limit"), v.literal("spent")), retryAfter: v.union(v.number(), v.null()) }),
);
export type Gate =
  | { ok: true; userId: string; name: string; dealId: Id<"deals"> | null }
  | { ok: false; why: "limit" | "spent"; retryAfter: number | null };

/**
 * `calls`: how many model calls the action is about to make. With
 * `run`, the ask's `deals` row is opened in the same transaction (deal).
 */
export const voice = internalMutation({
  args: { spaceId: v.id("spaces"), calls: v.number(), run: v.optional(v.string()) },
  returns: gateResult,
  handler: async (ctx, { spaceId, calls, run }): Promise<Gate> => {
    const me = await seatOf(ctx, spaceId);
    if (!me) throw new Error("not in this room");
    if ((await spentToday(ctx)).usd >= SPEND_CEILING_USD) return { ok: false, why: "spent", retryAfter: null };
    const count = Math.max(1, Math.min(8, Math.round(calls)));
    const person = { key: me.userId, count };
    const room = { key: spaceId, count };
    // two limiter calls, not four (check + limit): this sits in front of every model call
    const p = await rateLimiter.limit(ctx, "voicePerson", person);
    if (!p.ok) return { ok: false, why: "limit", retryAfter: p.retryAfter ?? null };
    const r = await rateLimiter.limit(ctx, "voiceRoomDay", room);
    if (!r.ok) return { ok: false, why: "limit", retryAfter: r.retryAfter ?? null };
    const dealId = run ? await ctx.db.insert("deals", { spaceId, run }) : null;
    return { ok: true, userId: me.userId, name: me.name, dealId };
  },
});

/** The orb's wake ping: any signed-in person, a few a minute. */
export const warm = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return false;
    return (await rateLimiter.limit(ctx, "voiceWarm", { key: me })).ok;
  },
});

/**
 * The room's other model calls a browser starts (recap "catch me up" and its
 * ask, the ask stream, a link's spark questions): a seat in the room, and
 * under the day's ceiling. Those calls report no tokens back
 * (convex/ai.ts completeJson), so the call is counted here, up front, at the
 * size of a mid-tier answer with a board in the prompt.
 */
export async function modelDoor(ctx: MutationCtx, spaceId: Id<"spaces">, model: ModelTier = "mid") {
  if (!(await seatOrMaker(ctx, spaceId))) throw new Error("not in this room");
  if ((await spentToday(ctx)).usd >= SPEND_CEILING_USD) throw new ConvexError("spent: the space's AI is resting until tomorrow");
  await noteSpendIn(ctx, [{ model, usage: { prompt_tokens: 2000, completion_tokens: 300 } }]);
}

export const model = internalMutation({
  args: { spaceId: v.id("spaces"), model: v.optional(v.union(v.literal("fast"), v.literal("mid"))) },
  returns: v.null(),
  handler: async (ctx, { spaceId, model }) => {
    await modelDoor(ctx, spaceId, model);
    return null;
  },
});

/** For the server's own model paths (game wording): past the ceiling, don't call. */
export const underCeiling = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => (await spentToday(ctx)).usd < SPEND_CEILING_USD,
});
