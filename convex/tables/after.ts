import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Afterspace's own tables (docs/plan/03-architecture/data-model.md). The rest arrive with their features. */

/** One row per model call: metrics only, never prompt, letter or receipt text. */
export const modelCalls = defineTable({
  job: v.string(), model: v.string(), ms: v.number(),
  inTok: v.number(), outTok: v.number(), usd: v.number(), at: v.number(),
}).index("by_at", ["at"]);
