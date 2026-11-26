import { defineTable } from "convex/server";
import { v } from "convex/values";

/** What comes in from outside: mail, links, the work log, recaps (schema.ts lists them). */

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

// /api/ask-stream gets a streamId only; the rest lives here.
export const askStreams = defineTable({
  spaceId: v.id("spaces"), streamId: v.string(), question: v.string(),
  messageId: v.id("messages"), // the recap turn to fill in when done
})
  .index("by_stream", ["streamId"]).index("by_space", ["spaceId"]);

// batch-worker queue: stale linkCards awaiting Firecrawl refresh.
export const linkRefreshQueue = defineTable({
  widgetId: v.id("widgets"),
  queuedAt: v.commitTs(), // commit-order cursor, not a wall-clock read
}).index("queuedAt", ["queuedAt"]);
