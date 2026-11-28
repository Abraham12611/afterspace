import { defineTable } from "convex/server";
import { v } from "convex/values";

/** The old-web social layer: buddy list visits and the visitor counter (features F1, F2). */

/** One row per member visit to a space. Distinct members = the visitor counter; also feeds Top 8 and the séance. */
export const visits = defineTable({
  spaceId: v.id("spaces"),
  memberId: v.id("members"),
  at: v.number(),
})
  .index("by_space", ["spaceId", "at"])
  .index("by_space_member", ["spaceId", "memberId", "at"]);
