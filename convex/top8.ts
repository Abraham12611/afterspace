import { v } from "convex/values";
import { query } from "./_generated/server";
import { seatOf } from "./seat";
import { TOP8_WINDOW_MS, top8, whyLine, type Interaction } from "../src/lib/top8";

const POLL_CAP = 100;
const CARD_CAP = 100;
const MESSAGE_CAP = 800;

/**
 * The caller's Top 8: the members they shared polls, rsvps, splits and card
 * threads with in the last 7 days (src/lib/top8.ts holds the rules). The caller
 * is the session's seat, never an argument.
 *
 * Time: a query result is cached, so the 7-day window is cut by the stamps the
 * rows carry, not by the clock. Votes and messages carry their own time; an rsvp
 * or a split card has none, so its card's creation time stands in for it.
 */
export const mine = query({
  args: { spaceId: v.id("spaces") },
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      color: v.string(),
      emoji: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      why: v.string(),
    }),
  ),
  handler: async (ctx, { spaceId }) => {
    const seat = await seatOf(ctx, spaceId);
    if (!seat) return [];
    const members = await ctx.db
      .query("members")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .take(200);
    const byUser = new Map(members.map((m) => [m.userId, m]));
    const byName = new Map(members.map((m) => [m.name.toLowerCase(), m]));
    const now = Date.now();
    const since = now - TOP8_WINDOW_MS;
    const found: Interaction[] = [];

    // polls: both voted on the same poll; counted when the later of the two votes landed
    const polls = await ctx.db
      .query("widgets")
      .withIndex("by_space_and_type", (q) => q.eq("spaceId", spaceId).eq("type", "poll"))
      .take(POLL_CAP);
    for (const poll of polls) {
      const votes = await ctx.db.query("votes").withIndex("by_widget", (q) => q.eq("widgetId", poll._id)).take(200);
      const mineVote = votes.find((vote) => vote.userId === seat.userId);
      if (!mineVote) continue;
      for (const vote of votes) {
        if (vote.userId === seat.userId || !byUser.has(vote.userId)) continue;
        found.push({ memberId: vote.userId, kind: "poll", at: Math.max(vote._creationTime, mineVote._creationTime) });
      }
    }

    // rsvps: both said yes; splits: both are on the same expense
    const resolve = (row: { userId?: string; name: string }) =>
      row.userId ? byUser.get(row.userId) : byName.get(row.name.toLowerCase());
    const rsvps = await ctx.db
      .query("widgets")
      .withIndex("by_space_and_type", (q) => q.eq("spaceId", spaceId).eq("type", "rsvp"))
      .take(CARD_CAP);
    for (const card of rsvps) {
      const data = card.data as { responses?: { name: string; userId?: string; status: string }[] };
      const yes = (data.responses ?? [])
        .filter((r) => r.status === "yes")
        .map((r) => resolve(r)?.userId)
        .filter((id): id is string => Boolean(id));
      if (!yes.includes(seat.userId)) continue;
      for (const id of new Set(yes)) {
        if (id !== seat.userId) found.push({ memberId: id, kind: "rsvp", at: card._creationTime });
      }
    }
    const splits = await ctx.db
      .query("widgets")
      .withIndex("by_space_and_type", (q) => q.eq("spaceId", spaceId).eq("type", "expenseSplit"))
      .take(CARD_CAP);
    for (const card of splits) {
      const data = card.data as { splits?: { name: string; userId?: string }[] };
      const ids = (data.splits ?? []).map((r) => resolve(r)?.userId).filter((id): id is string => Boolean(id));
      if (!ids.includes(seat.userId)) continue;
      for (const id of new Set(ids)) {
        if (id !== seat.userId) found.push({ memberId: id, kind: "split", at: card._creationTime });
      }
    }

    // threads: both wrote in the same card thread (the room chat does not count)
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .order("desc")
      .take(MESSAGE_CAP);
    const threads = new Map<string, Map<string, number>>();
    for (const message of recent) {
      if (message._creationTime < since) break;
      if (message.widgetId === "global") continue;
      const thread = threads.get(message.widgetId) ?? new Map<string, number>();
      thread.set(message.userId, Math.max(thread.get(message.userId) ?? 0, message.createdAt));
      threads.set(message.widgetId, thread);
    }
    for (const thread of threads.values()) {
      const mineAt = thread.get(seat.userId);
      if (mineAt === undefined) continue;
      for (const [id, at] of thread) {
        if (id !== seat.userId && byUser.has(id)) found.push({ memberId: id, kind: "thread", at: Math.max(at, mineAt) });
      }
    }

    const ranked = top8(
      seat.userId,
      found,
      now,
      members.map((m) => ({ id: m.userId, name: m.name })),
    );
    return ranked.map((entry) => {
      const m = byUser.get(entry.id)!;
      return {
        userId: m.userId,
        name: m.name,
        color: m.color,
        emoji: m.emoji,
        avatarUrl: m.avatarUrl,
        why: whyLine(entry.counts),
      };
    });
  },
});
