import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canRead, seatOf } from "./seat";
import type { SpiritBoardData } from "./widgetData";
import { FRESH_MS, answerUnder, arcLayout, mean, step, type Dwell } from "../src/lib/spiritBoard";

/**
 * The spirit board (F5), the server's half.
 *
 * Who is "a hand": a member holding the planchette, which is a Right of Way
 * lease (convex/leases.ts, thing = the card's id, kind "drag"), made from the
 * caller's session, so one person is one hand however many tabs they have open.
 * Where a hand points: its presence row, zone `board:<widgetId>:<memberUserId>`,
 * board-local 0..1, sent at the presence rate (usePresence reportZone).
 *
 * The client may ask `lock` about once a second. The server alone decides:
 * it reads the leases and the presence rows (with their timestamps), takes the
 * mean of the fresh pointers, finds the answer under it and runs the same
 * dwell rule as src/lib/spiritBoard.ts. It needs 2+ hands, so one person, or
 * one person in two tabs, can never lock an answer.
 */

export const zoneOf = (widgetId: string, userId: string) => `board:${widgetId}:${userId}`;

type Hand = { userId: string; name: string; color: string; x: number; y: number; updatedAt: number };

/** The live holders of a board and where each points (the freshest row per member). No clock in here: callers filter by `updatedAt`. */
async function handsOf(ctx: QueryCtx, spaceId: Id<"spaces">, widgetId: Id<"widgets">): Promise<Hand[]> {
  const leases = await ctx.db.query("leases").withIndex("by_thing", (q) => q.eq("spaceId", spaceId).eq("thing", widgetId)).take(16);
  const holders = new Map(leases.filter((l) => l.kind === "drag" && l.letGoAt === undefined).map((l) => [l.userId, l]));
  if (!holders.size) return [];
  const prefix = `board:${widgetId}:`;
  const rows = await ctx.db.query("presence").withIndex("by_space", (q) => q.eq("spaceId", spaceId)).collect();
  const best = new Map<string, Doc<"presence">>();
  for (const row of rows) {
    if (!row.zone?.startsWith(prefix)) continue;
    const member = row.zone.slice(prefix.length);
    if (!holders.has(member)) continue;
    const have = best.get(member);
    if (!have || row.updatedAt > have.updatedAt) best.set(member, row);
  }
  return [...best].map(([userId, row]) => {
    const lease = holders.get(userId)!;
    return { userId, name: lease.name, color: lease.color, x: row.x, y: row.y, updatedAt: row.updatedAt };
  });
}

/** Everyone with a hand on this board and where they point, for the planchette and the name tags. */
export const hands = query({
  args: { spaceId: v.id("spaces"), widgetId: v.id("widgets") },
  returns: v.array(v.object({ userId: v.string(), name: v.string(), color: v.string(), x: v.number(), y: v.number(), updatedAt: v.number() })),
  handler: async (ctx, { spaceId, widgetId }) => {
    if (!(await canRead(ctx, spaceId))) return [];
    const widget = await ctx.db.get(widgetId);
    if (!widget || widget.spaceId !== spaceId || widget.type !== "spiritBoard") return [];
    return await handsOf(ctx, spaceId, widgetId);
  },
});

const outcome = v.union(
  v.object({ state: v.literal("idle") }),
  v.object({ state: v.literal("dwelling"), answer: v.number(), since: v.number() }),
  v.object({ state: v.literal("locked"), answer: v.number() }),
);

/**
 * "Is the planchette resting?" One call per hand per second. Moves the dwell
 * forward from presence (never from anything the client says about where it
 * is) and writes the lock when 2+ hands have held one answer for 3 s.
 */
export const lock = mutation({
  args: { spaceId: v.id("spaces"), widgetId: v.id("widgets") },
  returns: outcome,
  handler: async (ctx, { spaceId, widgetId }) => {
    const idle = { state: "idle" as const };
    const me = await seatOf(ctx, spaceId);
    const widget = await ctx.db.get(widgetId);
    if (!me || !widget || widget.spaceId !== spaceId || widget.type !== "spiritBoard") return idle;
    const data = widget.data as SpiritBoardData;
    if (data.locked) return { state: "locked" as const, answer: data.locked.index };

    const now = Date.now();
    const fresh = (await handsOf(ctx, spaceId, widgetId)).filter((h) => now - h.updatedAt <= FRESH_MS);
    // the caller has to have a hand on it themselves
    if (!fresh.some((h) => h.userId === me.userId)) return idle;
    const layout = arcLayout(data.answers.length);
    const answer = answerUnder(mean(fresh), layout);
    const prev: Dwell | null = data.dwell ?? null;
    const { dwell, locked } = step(prev, { answer, hands: fresh.length, at: now });

    if (locked && dwell) {
      const label = data.answers[dwell.answer]?.label ?? "";
      const memberIds: Id<"members">[] = [];
      for (const h of fresh) {
        const m = await ctx.db.query("members").withIndex("by_space_user", (q) => q.eq("spaceId", spaceId).eq("userId", h.userId)).first();
        if (m) memberIds.push(m._id);
      }
      await ctx.db.insert("spiritLocks", { spaceId, widgetId, answer: label, lockedAt: now, hands: memberIds });
      const { dwell: _gone, ...rest } = data;
      await ctx.db.patch(widgetId, { data: { ...rest, locked: { index: dwell.answer, answer: label, at: now, hands: fresh.map((h) => h.name) } } });
      return { state: "locked" as const, answer: dwell.answer };
    }
    if (dwell?.answer !== prev?.answer || dwell?.since !== prev?.since || (dwell && dwell.seen !== prev?.seen)) {
      const { dwell: _old, ...rest } = data;
      await ctx.db.patch(widgetId, { data: dwell ? { ...rest, dwell } : rest });
    }
    return dwell ? { state: "dwelling" as const, answer: dwell.answer, since: dwell.since } : idle;
  },
});

/** "ask again": clears a locked board so the group can decide anew. Any seat in the space. */
export const reopen = mutation({
  args: { spaceId: v.id("spaces"), widgetId: v.id("widgets") },
  returns: v.null(),
  handler: async (ctx, { spaceId, widgetId }) => {
    if (!(await seatOf(ctx, spaceId))) return null;
    const widget = await ctx.db.get(widgetId);
    if (!widget || widget.spaceId !== spaceId || widget.type !== "spiritBoard") return null;
    const { locked: _l, dwell: _d, ...rest } = widget.data as SpiritBoardData;
    await ctx.db.patch(widgetId, { data: rest });
    for (const row of await ctx.db.query("spiritLocks").withIndex("by_widget", (q) => q.eq("widgetId", widgetId)).take(10)) await ctx.db.delete(row._id);
    return null;
  },
});
