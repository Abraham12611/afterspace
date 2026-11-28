import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { canRead, seatOf } from "./seat";
import { buddyRoomId, presence as roomPresence } from "./roomPresence";

/** F2 visitor counter: a member opening the space counts once per 30 minutes. */
export const VISIT_GAP_MS = 30 * 60 * 1000;
const COUNT_CAP = 5000;

export const recordVisit = mutation({
  args: { spaceId: v.id("spaces") },
  returns: v.boolean(),
  handler: async (ctx, { spaceId }) => {
    const seat = await seatOf(ctx, spaceId);
    if (!seat) return false;
    const member = await ctx.db
      .query("members")
      .withIndex("by_space_user", (q) => q.eq("spaceId", spaceId).eq("userId", seat.userId))
      .first();
    if (!member) return false;
    const now = Date.now();
    if (member.lastVisitAt !== undefined && now - member.lastVisitAt < VISIT_GAP_MS) return false;
    await ctx.db.insert("visits", { spaceId, memberId: member._id, at: now });
    await ctx.db.patch(member._id, { lastVisitAt: now });
    return true;
  },
});

export const counter = query({
  args: { spaceId: v.id("spaces") },
  returns: v.object({ distinctMembers: v.number(), totalVisits: v.number() }),
  handler: async (ctx, { spaceId }) => {
    if (!(await canRead(ctx, spaceId))) return { distinctMembers: 0, totalVisits: 0 };
    const rows = await ctx.db
      .query("visits")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .take(COUNT_CAP);
    return { distinctMembers: new Set(rows.map((r) => r.memberId)).size, totalVisits: rows.length };
  },
});

const DAY = 24 * 60 * 60 * 1000;

/**
 * Demo data for the coven (convex/seed.ts is not touched): a few visits, two away
 * messages, one idle member, and two members online. Safe to run twice.
 * `npx convex run visits:seedDemo`
 */
export const seedDemo = internalMutation({
  args: {},
  returns: v.object({ visits: v.number(), away: v.number() }),
  handler: async (ctx) => {
    const space = await ctx.db
      .query("spaces")
      .withIndex("by_slug", (q) => q.eq("slug", "coven"))
      .first();
    if (!space) return { visits: 0, away: 0 };
    const now = Date.now();
    const names = ["wren", "theo", "priya", "dante", "juno", "kai"];
    const away: Record<string, string> = {
      theo: "at the dentist, pray for me",
      priya: "brb, making tea",
    };
    let visits = 0;
    let awayCount = 0;
    for (const [i, name] of names.entries()) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_space_user", (q) => q.eq("spaceId", space._id).eq("userId", `seed:coven:${name}`))
        .first();
      if (!member) continue;
      const existing = await ctx.db
        .query("visits")
        .withIndex("by_space_member", (q) => q.eq("spaceId", space._id).eq("memberId", member._id))
        .first();
      if (!existing) {
        for (let k = 0; k < 2 + (i % 3); k += 1) {
          await ctx.db.insert("visits", { spaceId: space._id, memberId: member._id, at: now - (k * 2 + i) * DAY * 0.4 });
          visits += 1;
        }
      }
      const patch: { awayMessage?: string; awaySince?: number; idleSince?: number; lastVisitAt?: number } = {
        lastVisitAt: now - DAY,
      };
      if (away[name]) {
        patch.awayMessage = away[name];
        patch.awaySince = now - 20 * 60 * 1000;
        awayCount += 1;
      }
      if (name === "kai") patch.idleSince = now - 5 * 60 * 1000;
      await ctx.db.patch(member._id, patch);
      // everyone but dante is "online" for the next 6 hours, so the list looks lived in
      if (name !== "dante") {
        await roomPresence.heartbeat(ctx, buddyRoomId(space._id), `seed:coven:${name}`, `seed-${name}`, 6 * 60 * 60 * 1000);
      }
    }
    return { visits, away: awayCount };
  },
});
