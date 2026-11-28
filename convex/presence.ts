import { internalMutation, mutation, query } from "./_generated/server";
import { seatOf, canRead } from "./seat";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { cleanAwayMessage } from "../src/lib/buddy";
import { touchSpace } from "./activity";
import { buddyRoomId, presence as roomPresence } from "./roomPresence";
import schema from "./schema";

// The client hides a cursor after 30s (src/live/usePresence.ts); the sweep
// below runs well behind that so a brief tab stall never deletes a live row.
const PRESENCE_SWEEP_AFTER_MS = 120_000;
const GESTURE_TTL_MS = 1_500;

const identityArgs = {
  spaceId: v.id("spaces"),
  userId: v.string(),
  name: v.string(),
  color: v.string(),
  emoji: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  zone: v.optional(v.string()),
};

const gestureIdentityArgs = {
  spaceId: v.id("spaces"),
  userId: v.string(),
  name: v.string(),
  color: v.string(),
  emoji: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  cursorX: v.number(),
  cursorY: v.number(),
};

const gestureLayoutArgs = {
  widgetId: v.id("widgets"),
  kind: v.union(v.literal("move"), v.literal("resize")),
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number(),
  z: v.number(),
};

type PresenceIdentity = {
  spaceId: Id<"spaces">;
  userId: string;
  name: string;
  color: string;
  emoji?: string;
  avatarUrl?: string;
  x: number;
  y: number;
  zone?: string;
};

async function findPresence(
  ctx: MutationCtx,
  spaceId: Id<"spaces">,
  userId: string,
) {
  return await ctx.db
    .query("presence")
    .withIndex("by_space_user", (q) =>
      q.eq("spaceId", spaceId).eq("userId", userId),
    )
    .first();
}

async function upsertPresence(
  ctx: MutationCtx,
  identity: PresenceIdentity,
  updatedAt: number,
) {
  const existing = await findPresence(ctx, identity.spaceId, identity.userId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: identity.name,
      color: identity.color,
      emoji: identity.emoji,
      avatarUrl: identity.avatarUrl,
      x: identity.x,
      y: identity.y,
      zone: identity.zone,
      updatedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert("presence", { ...identity, updatedAt });
}

async function hasFreshCompetingGesture(
  ctx: MutationCtx,
  spaceId: Id<"spaces">,
  userId: string,
  widgetId: Id<"widgets">,
  now: number,
) {
  // One room's cursors, not the table — bounded by who is in the space, which
  // is what keeps it affordable on every 90ms gesture frame.
  const rows = await ctx.db
    .query("presence")
    .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
    .collect();
  return rows.some(
    (row) =>
      row.userId !== userId &&
      row.gesture?.widgetId === widgetId &&
      now - row.gesture.updatedAt < GESTURE_TTL_MS,
  );
}

function gestureIdentity(args: {
  spaceId: Id<"spaces">;
  userId: string;
  name: string;
  color: string;
  emoji?: string;
  avatarUrl?: string;
  cursorX: number;
  cursorY: number;
}): PresenceIdentity {
  return {
    spaceId: args.spaceId,
    userId: args.userId,
    name: args.name,
    color: args.color,
    emoji: args.emoji,
    avatarUrl: args.avatarUrl,
    x: args.cursorX,
    y: args.cursorY,
  };
}

export const heartbeat = mutation({
  args: identityArgs,
  returns: v.id("presence"),
  handler: async (ctx, identity) => {
    return await upsertPresence(ctx, identity, Date.now());
  },
});

export const claimGesture = mutation({
  args: {
    ...gestureIdentityArgs,
    sessionId: v.string(),
    ...gestureLayoutArgs,
  },
  returns: v.union(
    v.object({ accepted: v.literal(false), reason: v.literal("missing") }),
    v.object({
      accepted: v.literal(false),
      reason: v.literal("locked"),
      owner: v.object({ userId: v.string(), name: v.string(), color: v.string() }),
    }),
    v.object({ accepted: v.literal(true) }),
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const widget = await ctx.db.get(args.widgetId);
    if (!widget || widget.spaceId !== args.spaceId) {
      return { accepted: false as const, reason: "missing" as const };
    }

    const rows = await ctx.db
      .query("presence")
      .withIndex("by_space", (q) => q.eq("spaceId", args.spaceId))
      .collect();
    const owner = rows
      .filter(
        (row) =>
          row.userId !== args.userId &&
          row.gesture?.widgetId === args.widgetId &&
          now - row.gesture.updatedAt < GESTURE_TTL_MS,
      )
      .sort((a, b) => {
        const freshness =
          (b.gesture?.updatedAt ?? 0) - (a.gesture?.updatedAt ?? 0);
        return freshness || a.userId.localeCompare(b.userId);
      })[0];

    if (owner) {
      await upsertPresence(ctx, gestureIdentity(args), now);
      return {
        accepted: false as const,
        reason: "locked" as const,
        owner: {
          userId: owner.userId,
          name: owner.name,
          color: owner.color,
        },
      };
    }

    const presenceId = await upsertPresence(ctx, gestureIdentity(args), now);
    await ctx.db.patch(presenceId, {
      gesture: {
        sessionId: args.sessionId,
        widgetId: args.widgetId,
        kind: args.kind,
        x: args.x,
        y: args.y,
        w: args.w,
        h: args.h,
        z: args.z,
        updatedAt: now,
      },
    });
    return { accepted: true as const };
  },
});

export const updateGesture = mutation({
  args: {
    ...gestureIdentityArgs,
    sessionId: v.string(),
    ...gestureLayoutArgs,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await findPresence(ctx, args.spaceId, args.userId);
    const now = Date.now();
    // Reads one row and writes one row — the same one — which is the whole
    // point. This used to re-check `hasFreshCompetingGesture` on every frame
    // of a drag, and that collect() put every cursor in the room into this
    // mutation's read set 20x a second, so the person dragging took an OCC
    // conflict off each of their friends' heartbeats and re-ran. Arbitration
    // belongs at the two edges that persist something: claim and finish.
    if (
      !existing?.gesture ||
      existing.gesture.sessionId !== args.sessionId ||
      existing.gesture.widgetId !== args.widgetId ||
      now - existing.gesture.updatedAt >= GESTURE_TTL_MS
    ) {
      if (
        existing?.gesture?.sessionId === args.sessionId &&
        existing.gesture.widgetId === args.widgetId
      ) {
        await ctx.db.patch(existing._id, { gesture: undefined });
      }
      return false;
    }

    await ctx.db.patch(existing._id, {
      name: args.name,
      color: args.color,
      emoji: args.emoji,
      avatarUrl: args.avatarUrl,
      x: args.cursorX,
      y: args.cursorY,
      updatedAt: now,
      gesture: {
        sessionId: args.sessionId,
        widgetId: args.widgetId,
        kind: args.kind,
        x: args.x,
        y: args.y,
        w: args.w,
        h: args.h,
        z: args.z,
        updatedAt: now,
      },
    });
    return true;
  },
});

export const finishGesture = mutation({
  args: {
    ...gestureIdentityArgs,
    sessionId: v.string(),
    ...gestureLayoutArgs,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await findPresence(ctx, args.spaceId, args.userId);
    const now = Date.now();
    if (
      !existing?.gesture ||
      existing.gesture.sessionId !== args.sessionId ||
      existing.gesture.widgetId !== args.widgetId ||
      now - existing.gesture.updatedAt >= GESTURE_TTL_MS ||
      (await hasFreshCompetingGesture(
        ctx,
        args.spaceId,
        args.userId,
        args.widgetId,
        now,
      ))
    ) {
      if (
        existing?.gesture?.sessionId === args.sessionId &&
        existing.gesture.widgetId === args.widgetId
      ) {
        await ctx.db.patch(existing._id, { gesture: undefined });
      }
      return false;
    }

    const widget = await ctx.db.get(args.widgetId);
    // the drop writes the card: a seat in this room, from the session (S3)
    if (!widget || widget.spaceId !== args.spaceId || !(await seatOf(ctx, args.spaceId))) {
      await ctx.db.patch(existing._id, {
        gesture: undefined,
        updatedAt: now,
      });
      return false;
    }

    await ctx.db.patch(args.widgetId, {
      x: args.x,
      y: args.y,
      w: args.w,
      h: args.h,
      z: args.z,
    });
    // The real drag/resize commit on the canvas — `widgets.moveWidget` only
    // runs on the keyboard/editor fallback path. Throttled inside touchSpace,
    // so a room full of people dragging still writes the space row ≤1×/min.
    await touchSpace(ctx, args.spaceId, now);
    await ctx.db.patch(existing._id, {
      name: args.name,
      color: args.color,
      emoji: args.emoji,
      avatarUrl: args.avatarUrl,
      x: args.cursorX,
      y: args.cursorY,
      updatedAt: now,
      gesture: undefined,
    });
    return true;
  },
});

export const cancelGesture = mutation({
  args: {
    spaceId: v.id("spaces"),
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await findPresence(ctx, args.spaceId, args.userId);
    if (!existing?.gesture || existing.gesture.sessionId !== args.sessionId) {
      return false;
    }
    await ctx.db.patch(existing._id, {
      gesture: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const listHereNow = query({
  args: { spaceId: v.id("spaces") },
  returns: v.array(schema.doc("presence")),
  // No Date.now() here on purpose. A query's result is cached against its
  // args, so a wall-clock bound inside the handler never re-evaluates as time
  // passes — it only moves when a presence row is written, which is not what
  // "who is here right now" means. Freshness is owned by the two things that
  // actually observe time: the cleanup cron sweeps rows past the TTL, and the
  // client re-filters on its own tick (src/live/usePresence.ts) — the client's
  // filter is the one that decides what a person SEES, which is why the sweep
  // can run as infrequently as it does.
  handler: async (ctx, { spaceId }) => {
    if (!(await canRead(ctx, spaceId))) return [];
    return await ctx.db
      .query("presence")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
  },
});

/**
 * Not part of the cursor system — an adapter, and it has to live at exactly
 * this path.
 *
 * @convex-dev/presence's React hook says goodbye on `beforeunload` with a
 * `navigator.sendBeacon`, because by then the websocket is already going away.
 * That beacon posts to a HARDCODED function path: `presence:disconnect`. Our
 * room-occupancy API lives in `roomPresence.ts` (deliberately — see the note
 * at the top of that file), so the beacon was hitting a function that did not
 * exist and failing silently. The result: closing a tab never told the server
 * anything, and "N here now" stayed wrong until the 30s liveness window
 * expired. Measured at ~17s stale before this existed, ~1s after.
 *
 * If you rename this, rename it back.
 */
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await roomPresence.disconnect(ctx, sessionToken);
    return null;
  },
});

export const cleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const staleBefore = Date.now() - PRESENCE_SWEEP_AFTER_MS;
    // Reads ONLY the rows it is about to delete. This used to collect the
    // whole table and filter in memory, which made the sweep's read set every
    // presence row in the app — so it took an OCC conflict from every
    // heartbeat that landed while it ran, and each loser re-executed. The
    // by_updated range stops at `staleBefore`, and a live cursor writes `now`,
    // so the two no longer overlap. See the index comment in schema.ts.
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_updated", (q) => q.lt("updatedAt", staleBefore))
      .collect();
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// F1 buddy list: who is here, away or gone, with away messages.
// ---------------------------------------------------------------------------

async function memberOf(ctx: MutationCtx, spaceId: Id<"spaces">) {
  const seat = await seatOf(ctx, spaceId);
  if (!seat) throw new ConvexError("not in this room");
  const member = await ctx.db
    .query("members")
    .withIndex("by_space_user", (q) => q.eq("spaceId", spaceId).eq("userId", seat.userId))
    .first();
  if (!member) throw new ConvexError("not in this room");
  return member;
}

/** The roster with live status. Online comes from the presence component, so it flips on its own timer. */
export const buddyList = query({
  args: { spaceId: v.id("spaces") },
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      color: v.string(),
      emoji: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      online: v.boolean(),
      awayMessage: v.optional(v.string()),
      awaySince: v.optional(v.number()),
      idleSince: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { spaceId }) => {
    if (!(await canRead(ctx, spaceId))) return [];
    const members = await ctx.db
      .query("members")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .take(200);
    const here = await roomPresence.listRoom(ctx, buddyRoomId(spaceId), true);
    const online = new Set(here.map((row) => row.userId));
    return members.map((m) => ({
      userId: m.userId,
      name: m.name,
      color: m.color,
      emoji: m.emoji,
      avatarUrl: m.avatarUrl,
      online: online.has(m.userId),
      awayMessage: m.awayMessage,
      awaySince: m.awaySince,
      idleSince: m.idleSince,
    }));
  },
});

export const setAway = mutation({
  args: { spaceId: v.id("spaces"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, { spaceId, message }) => {
    const member = await memberOf(ctx, spaceId);
    const clean = cleanAwayMessage(message);
    if (!clean) throw new ConvexError("say where you went");
    await ctx.db.patch(member._id, { awayMessage: clean, awaySince: Date.now() });
    return null;
  },
});

/** "i'm back": clears the message and the idle flag. */
export const clearAway = mutation({
  args: { spaceId: v.id("spaces") },
  returns: v.null(),
  handler: async (ctx, { spaceId }) => {
    const member = await memberOf(ctx, spaceId);
    if (member.awayMessage !== undefined || member.awaySince !== undefined || member.idleSince !== undefined) {
      await ctx.db.patch(member._id, { awayMessage: undefined, awaySince: undefined, idleSince: undefined });
    }
    return null;
  },
});

/** The tab has been hidden for 2 minutes (idle: true) or is back (idle: false). Writes only on a change. */
export const setIdle = mutation({
  args: { spaceId: v.id("spaces"), idle: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { spaceId, idle }) => {
    const member = await memberOf(ctx, spaceId);
    if (idle && member.idleSince === undefined) await ctx.db.patch(member._id, { idleSince: Date.now() });
    if (!idle && member.idleSince !== undefined) await ctx.db.patch(member._id, { idleSince: undefined });
    return null;
  },
});
