import { defineTable } from "convex/server";
import { v } from "convex/values";

/** What the room keeps about its own AI: the work log and recaps (schema.ts lists them). */

export const work = defineTable({
  spaceId: v.id("spaces"), runId: v.string(), step: v.string(), line: v.string(),
  kind: v.union(v.literal("mail"), v.literal("link"), v.literal("search"), v.literal("crawl")),
  status: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
  subject: v.optional(v.string()), widgetId: v.optional(v.id("widgets")), createdAt: v.number(),
}).index("by_space", ["spaceId"]);

export const recaps = defineTable({
  spaceId: v.id("spaces"), since: v.string(), kind: v.union(v.literal("daily"), v.literal("ask")),
  lines: v.array(v.object({ text: v.string(), widgetId: v.optional(v.string()), messageId: v.optional(v.string()) })),
  createdAt: v.number(),
}).index("by_space", ["spaceId"]).index("by_space_kind_created", ["spaceId", "kind", "createdAt"]);
