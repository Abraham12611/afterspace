import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { canRead, seatOf } from "./seat";
import { completeJsonWithUsage } from "./openrouter";
import {
  DEAD_AFTER_MS, HOUR_MS, PLAN_GRAVE_AFTER_MS, REVIVE_NEED, cannedEpitaph, causeOf, cleanEpitaph, health, hint, reviveName, reviveProgress, stateOf, trimEvents,
  type EventKind, type HintTopics, type PetEvent,
} from "../src/lib/familiar";
import { familiarState } from "./tables/haunt";

/**
 * The pet (F4). Health is recomputed from real activity (src/lib/familiar.ts):
 * `activity.recordEvent` appends an event whenever a person does something
 * (a card, a vote, a claim...) and re-scores the pet at once; `tick` runs every
 * 30 min so health decays and death is noticed. Code decides, the model only
 * writes the epitaph line (job "epitaph", canned fallback, spend guard first).
 */

type Pet = Doc<"familiars">;
const KINDS: readonly string[] = ["hatch", "card", "vote", "rsvp", "claim", "split", "checkin", "letter", "reply", "present"];
const eventsOf = (pet: Pet): PetEvent[] => (pet.events ?? []).filter((e) => KINDS.includes(e.kind)) as PetEvent[];
const SPACES_PER_TICK = 20;
/** a model-written epitaph only for a pet; plans get canned lines (no spend) */
const GRAVE_CAP = 300;

export async function latestPet(ctx: QueryCtx, spaceId: Id<"spaces">): Promise<Pet | null> {
  return await ctx.db.query("familiars").withIndex("by_space", (q) => q.eq("spaceId", spaceId)).order("desc").first();
}

/** A new pet. `carry` = the acts of the people who revived it, kept so it doesn't start at the bottom of a hole. */
export async function hatch(ctx: MutationCtx, spaceId: Id<"spaces">, name: string, generation: number, now: number, carry: PetEvent[] = []): Promise<Id<"familiars">> {
  const events = trimEvents([{ kind: "hatch", at: now }, ...carry], now);
  const h = health(events, now);
  return await ctx.db.insert("familiars", { spaceId, name, generation, health: h, state: stateOf(h), bornAt: now, lastTickAt: now, events });
}

/** The ritual: a dead pet with REVIVE_NEED distinct members acting within 24 h hatches a new generation. */
export async function reviveIfReady(ctx: MutationCtx, pet: Pet, events: PetEvent[], now: number): Promise<boolean> {
  if (pet.state !== "dead") return false;
  if (reviveProgress(events, pet.diedAt ?? pet.bornAt, now) < REVIVE_NEED) return false;
  const generation = pet.generation + 1;
  const carry = events.filter((e) => e.kind !== "hatch" && e.kind !== "present" && now - e.at < 24 * HOUR_MS);
  await hatch(ctx, pet.spaceId, reviveName(pet.name, generation), generation, now, carry);
  return true;
}

/** What the room could use a hand with: one title per kind, only for things that exist. */
async function topicsOf(ctx: QueryCtx, spaceId: Id<"spaces">): Promise<HintTopics> {
  const of = (type: string) => ctx.db.query("widgets").withIndex("by_space_and_type", (q) => q.eq("spaceId", spaceId).eq("type", type)).take(30);
  const [polls, rsvps, potlucks, checkIns] = await Promise.all([of("poll"), of("rsvp"), of("potluck"), of("checkIn")]);
  const short = (s: unknown) => String(s ?? "").toLowerCase().replace(/[?!.]+$/, "").slice(0, 40).trim();
  const topics: HintTopics = {};
  const poll = polls.find((w) => {
    const d = w.data as { options?: { votes?: number }[]; closesAt?: string };
    return (d.options ?? []).reduce((n, o) => n + (o.votes ?? 0), 0) === 0 && !(d.closesAt && Date.parse(`${d.closesAt}Z`) < Date.now());
  });
  if (poll) topics.vote = short((poll.data as { question?: string }).question);
  const rsvp = rsvps.find((w) => ((w.data as { responses?: unknown[] }).responses ?? []).length === 0);
  if (rsvp) topics.rsvp = short((rsvp.data as { title?: string }).title);
  const potluck = potlucks.find((w) => ((w.data as { items?: { claimed?: boolean }[] }).items ?? []).some((i) => !i.claimed));
  if (potluck) topics.claim = short((potluck.data as { title?: string }).title);
  const ci = checkIns[0];
  if (ci) topics.checkin = short((ci.data as { title?: string }).title);
  for (const k of Object.keys(topics) as EventKind[]) if (!topics[k]) delete topics[k];
  return topics;
}

const petView = v.object({
  name: v.string(),
  generation: v.number(),
  health: v.number(),
  state: familiarState,
  bornAt: v.number(),
  diedAt: v.union(v.number(), v.null()),
  hint: v.union(v.string(), v.null()),
  /** a dead pet: how many of the 3 members needed have acted since */
  revive: v.union(v.object({ have: v.number(), need: v.number() }), v.null()),
});

/** The space's newest pet, its hint, and (when dead) the revive progress. Null until `ensure` or the tick makes one. */
export const forSpace = query({
  args: { spaceId: v.id("spaces") },
  returns: v.union(petView, v.null()),
  handler: async (ctx, { spaceId }) => {
    if (!(await canRead(ctx, spaceId))) return null;
    const pet = await latestPet(ctx, spaceId);
    if (!pet) return null;
    const events = eventsOf(pet);
    // a query has no live clock: score against the newest thing the pet knows about
    const ref = events.reduce((m, e) => Math.max(m, e.at), pet.lastTickAt);
    const dead = pet.state === "dead";
    return {
      name: pet.name,
      generation: pet.generation,
      health: pet.health,
      state: pet.state,
      bornAt: pet.bornAt,
      diedAt: pet.diedAt ?? null,
      hint: dead ? null : hint(events, ref, pet.topics as HintTopics | undefined),
      revive: dead ? { have: reviveProgress(events, pet.diedAt ?? pet.bornAt, ref), need: REVIVE_NEED } : null,
    };
  },
});

/** The graveyard page: tombstones, newest first. */
export const graveyardFor = query({
  args: { spaceId: v.id("spaces") },
  returns: v.array(v.object({
    _id: v.id("graveyard"), kind: v.union(v.literal("pet"), v.literal("plan")), name: v.string(), epitaph: v.string(),
    born: v.number(), died: v.number(), cause: v.string(),
  })),
  handler: async (ctx, { spaceId }) => {
    if (!(await canRead(ctx, spaceId))) return [];
    const rows = await ctx.db.query("graveyard").withIndex("by_space", (q) => q.eq("spaceId", spaceId)).order("desc").take(100);
    return rows.map((r) => ({ _id: r._id, kind: r.kind, name: r.name, epitaph: r.epitaph, born: r.born, died: r.died, cause: r.cause }));
  },
});

/** A first visit makes the space's pet if it has none (the tick does it too). Any seat in the space may ask. */
export const ensure = mutation({
  args: { spaceId: v.id("spaces") },
  returns: v.null(),
  handler: async (ctx, { spaceId }) => {
    if (!(await seatOf(ctx, spaceId))) return null;
    if (await latestPet(ctx, spaceId)) return null;
    await hatch(ctx, spaceId, "wisp", 1, Date.now());
    return null;
  },
});

/** Rows of the dead for a pet that just died: a tombstone with a canned line now, the model's line a moment later. */
async function bury(ctx: MutationCtx, pet: Pet, events: PetEvent[], now: number) {
  const cause = causeOf(events, pet.bornAt, now);
  const id = await ctx.db.insert("graveyard", {
    spaceId: pet.spaceId, kind: "pet", name: pet.name, epitaph: cannedEpitaph(`${pet.spaceId}:${pet.name}:${pet.bornAt}`),
    born: pet.bornAt, died: now, cause,
  });
  await ctx.scheduler.runAfter(0, internal.familiar.epitaph, { graveyardId: id, name: pet.name, cause, days: Math.max(1, Math.round((now - pet.bornAt) / (24 * HOUR_MS))) });
}

const iso = (s: unknown) => (typeof s === "string" ? s : "");

/** Closed polls and expired countdowns older than 14 days get a "plan" tombstone, once each. */
async function buryPlans(ctx: MutationCtx, spaceId: Id<"spaces">, now: number) {
  const buried = new Set((await ctx.db.query("graveyard").withIndex("by_space", (q) => q.eq("spaceId", spaceId)).take(GRAVE_CAP)).map((g) => g.widgetId).filter(Boolean));
  const of = (type: string) => ctx.db.query("widgets").withIndex("by_space_and_type", (q) => q.eq("spaceId", spaceId).eq("type", type)).take(60);
  for (const w of await of("poll")) {
    const d = w.data as { question?: string; closesAt?: string };
    const end = d.closesAt ? Date.parse(`${iso(d.closesAt)}Z`) : NaN;
    if (buried.has(w._id) || !Number.isFinite(end) || now - end < PLAN_GRAVE_AFTER_MS) continue;
    await ctx.db.insert("graveyard", { spaceId, kind: "plan", name: String(d.question ?? "a poll").toLowerCase().slice(0, 60), epitaph: cannedEpitaph(`${w._id}`), born: w.createdAt, died: end, cause: "the vote closed and nobody did anything about it", widgetId: w._id });
  }
  for (const w of await of("countdown")) {
    const d = w.data as { event?: string; targetDate?: string };
    const end = d.targetDate ? Date.parse(`${iso(d.targetDate)}T23:59:59Z`) : NaN;
    if (buried.has(w._id) || !Number.isFinite(end) || now - end < PLAN_GRAVE_AFTER_MS) continue;
    await ctx.db.insert("graveyard", { spaceId, kind: "plan", name: String(d.event ?? "a countdown").toLowerCase().slice(0, 60), epitaph: cannedEpitaph(`${w._id}`), born: w.createdAt, died: end, cause: "the date came and went", widgetId: w._id });
  }
}

async function tickSpace(ctx: MutationCtx, space: Doc<"spaces">, now: number) {
  let pet = await latestPet(ctx, space._id);
  if (!pet) {
    await hatch(ctx, space._id, "wisp", 1, now);
    pet = await latestPet(ctx, space._id);
  }
  if (!pet) return;
  // members showing up count once each, by their freshest visit (members.lastSeen; written when someone enters).
  // seeded cast ("seed:..." ids) are fictional: their demo events are kept as seeded, never refreshed.
  const members = await ctx.db.query("members").withIndex("by_space", (q) => q.eq("spaceId", space._id)).take(60);
  const isSeed = (id?: string) => !!id && id.startsWith("seed:");
  const kept = eventsOf(pet).filter((e) => e.kind !== "present" || isSeed(e.by));
  const present: PetEvent[] = members.filter((m) => !isSeed(m.userId) && now - m.lastSeen < 72 * HOUR_MS).map((m) => ({ kind: "present", at: m.lastSeen, by: m.userId }));
  const events = trimEvents([...kept, ...present], now);

  if (pet.state === "dead") {
    await ctx.db.patch(pet._id, { events, lastTickAt: now });
    await reviveIfReady(ctx, pet, events, now);
  } else {
    const h = health(events, now);
    const zeroSince = h === 0 ? (pet.zeroSince ?? now) : undefined;
    const state = stateOf(h, zeroSince === undefined ? 0 : now - zeroSince);
    await ctx.db.patch(pet._id, { events, health: h, state, zeroSince, lastTickAt: now, topics: await topicsOf(ctx, space._id), ...(state === "dead" ? { diedAt: now } : {}) });
    if (state === "dead") await bury(ctx, pet, events, now);
  }
  await buryPlans(ctx, space._id, now);
}

/** Every 30 min (crons.ts): re-score every space's pet, notice deaths, bury old plans. Pages through the spaces and schedules itself for the next page. */
export const tick = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const now = Date.now();
    const page = await ctx.db.query("spaces").paginate({ numItems: SPACES_PER_TICK, cursor: cursor ?? null });
    for (const space of page.page) if (!space.archivedAt) await tickSpace(ctx, space, now);
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.familiar.tick, { cursor: page.continueCursor });
    return null;
  },
});

export const setEpitaph = internalMutation({
  args: { graveyardId: v.id("graveyard"), epitaph: v.string() },
  returns: v.null(),
  handler: async (ctx, { graveyardId, epitaph }) => {
    if (await ctx.db.get(graveyardId)) await ctx.db.patch(graveyardId, { epitaph });
    return null;
  },
});

const EPITAPH_SYSTEM =
  'You write one gravestone line for a friend group\'s pet ghost. Lowercase, dry and warm, under 14 words, no emoji, no quotes, no names of real people. Reply as JSON: {"epitaph":"..."}';

/** The model's line for a tombstone. Skipped (the canned line stays) when there is no key or the day's spend ceiling is reached. */
export const epitaph = internalAction({
  args: { graveyardId: v.id("graveyard"), name: v.string(), cause: v.string(), days: v.number() },
  returns: v.null(),
  handler: async (ctx, a): Promise<null> => {
    const spend: { usd: number; ceilingUsd: number } = await ctx.runQuery(internal.guard.day, {});
    if (spend.usd >= spend.ceilingUsd) return null;
    const out = await completeJsonWithUsage({
      job: "epitaph",
      system: EPITAPH_SYSTEM,
      user: `the pet was called "${a.name}". it lived ${a.days} days. it died because ${a.cause}.`,
      maxTokens: 80,
    });
    if (out.usage) {
      await ctx.runMutation(internal.guard.noteSpend, { calls: [{ model: "fast", prompt: out.usage.prompt_tokens ?? 0, completion: out.usage.completion_tokens ?? 0, job: "epitaph", ms: out.ms }] });
    }
    const line = cleanEpitaph(out.json?.epitaph);
    if (line) await ctx.runMutation(internal.familiar.setEpitaph, { graveyardId: a.graveyardId, epitaph: line });
    return null;
  },
});

/** Demo events: a pet three days from hungry, with three members who showed up a day ago. */
export function hungryEvents(now: number, memberIds: string[]): PetEvent[] {
  return [
    { kind: "hatch", at: now - 60 * HOUR_MS },
    { kind: "card", at: now - 20 * HOUR_MS, by: memberIds[0] },
    ...memberIds.slice(0, 3).map((by): PetEvent => ({ kind: "present", at: now - 30 * HOUR_MS, by })),
  ];
}

/** Put a pet in a demo state: `npx convex run familiar:fastForward '{"slug":"coven","to":"hungry"}'`. A dead pet gets a tombstone. */
export const fastForward = internalMutation({
  args: { slug: v.string(), to: v.union(v.literal("hungry"), v.literal("fading"), v.literal("dead")) },
  returns: v.union(v.object({ state: familiarState, health: v.number() }), v.null()),
  handler: async (ctx, { slug, to }) => {
    const space = await ctx.db.query("spaces").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!space) return null;
    const now = Date.now();
    let pet = await latestPet(ctx, space._id);
    if (!pet) {
      await hatch(ctx, space._id, "wisp", 1, now);
      pet = (await latestPet(ctx, space._id))!;
    }
    if (to === "dead") {
      if (pet.state !== "dead") {
        await ctx.db.patch(pet._id, { events: [], health: 0, state: "dead", zeroSince: now - DEAD_AFTER_MS - HOUR_MS, diedAt: now });
        await bury(ctx, { ...pet, events: [] }, [], now);
      }
      return { state: "dead" as const, health: 0 };
    }
    const members = await ctx.db.query("members").withIndex("by_space", (q) => q.eq("spaceId", space._id)).take(3);
    const events = to === "hungry" ? hungryEvents(now, members.map((m) => m.userId)) : [{ kind: "hatch" as const, at: now - 70 * HOUR_MS }];
    const h = health(events, now);
    const state = stateOf(h);
    await ctx.db.patch(pet._id, { events, health: h, state, zeroSince: undefined, diedAt: undefined, lastTickAt: now, topics: await topicsOf(ctx, space._id) });
    return { state, health: h };
  },
});

/** Dev check: the newest pet of a space by slug, with its raw numbers (`npx convex run familiar:inspect '{"slug":"coven"}'`). */
export const inspect = internalQuery({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, { slug }) => {
    const space = await ctx.db.query("spaces").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!space) return null;
    const pet = await latestPet(ctx, space._id);
    if (!pet) return null;
    const events = eventsOf(pet);
    const ref = events.reduce((m, e) => Math.max(m, e.at), pet.lastTickAt);
    const graves = await ctx.db.query("graveyard").withIndex("by_space", (q) => q.eq("spaceId", space._id)).take(20);
    return {
      spaceId: space._id, name: pet.name, generation: pet.generation, health: pet.health, state: pet.state,
      hint: pet.state === "dead" ? null : hint(events, ref, pet.topics as HintTopics | undefined),
      revive: pet.state === "dead" ? reviveProgress(events, pet.diedAt ?? pet.bornAt, ref) : null,
      events: events.length, graveyard: graves.map((g) => ({ kind: g.kind, name: g.name, epitaph: g.epitaph, cause: g.cause })),
    };
  },
});
