import { defineTable } from "convex/server";
import { v } from "convex/values";

/** The pet, its graveyard, and spirit-board locks (features F4, F5). */

export const familiarState = v.union(
  v.literal("thriving"), v.literal("okay"), v.literal("hungry"), v.literal("fading"), v.literal("dead"),
);

/** One live pet per space (the newest generation). Health is recomputed by a cron from real activity. */
export const familiars = defineTable({
  spaceId: v.id("spaces"),
  name: v.string(),
  generation: v.number(), // 1, 2 ... a revived pet is "<name> ii"
  health: v.number(), // 0-100, from src/lib/familiar.ts health()
  state: familiarState,
  bornAt: v.number(),
  zeroSince: v.optional(v.number()), // when health first hit 0; dead after 24 h at 0
  diedAt: v.optional(v.number()),
  lastTickAt: v.number(),
}).index("by_space", ["spaceId", "bornAt"]);

/** Dead pets and plans that died (expired countdowns, long-closed polls), with an epitaph. */
export const graveyard = defineTable({
  spaceId: v.id("spaces"),
  kind: v.union(v.literal("pet"), v.literal("plan")),
  name: v.string(),
  epitaph: v.string(),
  born: v.number(),
  died: v.number(),
  cause: v.string(),
  widgetId: v.optional(v.id("widgets")),
}).index("by_space", ["spaceId", "died"]);

/** A spirit board's locked answer. One row per board once locked. */
export const spiritLocks = defineTable({
  spaceId: v.id("spaces"),
  widgetId: v.id("widgets"),
  answer: v.string(),
  lockedAt: v.number(),
  hands: v.array(v.id("members")),
}).index("by_widget", ["widgetId"]);
