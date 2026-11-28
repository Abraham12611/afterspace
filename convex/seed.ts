import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { SPACES_BY_ID, type Widget } from "../src/data/spaces";
import { getGlobalThread, getThreadsForSpace } from "../src/data/chat";
import { retireCutSpaceRows, memberCounts } from "./spaces";
import { pollTallies } from "./votes";
import { messagesCounter, spacesCounter, widgetsCounter } from "./stats";
import type { WidgetData } from "./widgetData";
import { internal } from "./_generated/api";
import { latestPet, hungryEvents } from "./familiar";
import { DEAD_AFTER_MS, HOUR_MS, health, stateOf } from "../src/lib/familiar";

const DAY_MS = 24 * HOUR_MS;

function seedUserId(slug: string, name: string) {
  return `seed:${slug}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function convexSafe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convexSafe);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      /^[\x20-\x7E]+$/.test(key)
        ? key
        : `__unicode_${Array.from(key).map((char) => char.codePointAt(0)?.toString(16)).join("_")}`,
      convexSafe(child),
    ]),
  );
}

type Rows = Record<string, unknown>[];
/**
 * Choice rows carry their person's seat (R4, the gate treats a name-only row as nobody's own): a split's rows, rsvp
 * answers, claims and check-in people. `id` maps a name to a seat, or null to leave the row as it is ("you" never).
 */
export function stampSeats(type: string, data: Record<string, unknown>, id: (name: string) => string | null): Record<string, unknown> | null {
  const each = (key: string, f: (r: Record<string, unknown>) => Record<string, unknown>) => {
    const rows = Array.isArray(data[key]) ? (data[key] as Rows) : [];
    const next = rows.map(f);
    return next.some((r, i) => r !== rows[i]) ? { ...data, [key]: next } : null;
  };
  const seat = (name: unknown) => (typeof name === "string" && name.trim() && name.trim().toLowerCase() !== "you" ? id(name) : null);
  const by = (field: string, idField: string) => (r: Record<string, unknown>) => {
    const s = r[idField] === undefined ? seat(r[field]) : null;
    return s ? { ...r, [idField]: s } : r;
  };
  if (type === "expenseSplit") return each("splits", by("name", "userId"));
  if (type === "rsvp") return each("responses", by("name", "userId"));
  if (type === "checkIn") return each("people", by("name", "userId"));
  if (type === "potluck") return each("items", (r) => (r.claimed ? by("by", "byUserId")(r) : r));
  return null;
}

/** One seeded widget, at `at` (the mock spot, or a free one on a live room). */
async function insertWidget(
  ctx: MutationCtx,
  spaceId: Id<"spaces">,
  slug: string,
  createdBy: string,
  widget: Widget,
  at: { x: number; y: number },
  now: number,
) {
  const id = await ctx.db.insert("widgets", {
    spaceId,
    type: widget.type,
    x: at.x,
    y: at.y,
    w: widget.w,
    h: widget.h,
    z: widget.z,
    rotate: widget.rotate,
    data: convexSafe(stampSeats(widget.type, widget.data as Record<string, unknown>, (name) => seedUserId(slug, name)) ?? widget.data) as WidgetData,
    createdBy,
    createdAt: now,
  });
  await widgetsCounter.inc(ctx);

  if (widget.type === "poll") {
    for (const option of (widget.data.options as any[] | undefined) ?? []) {
      for (const voter of option.voters ?? []) {
        const voteId = await ctx.db.insert("votes", {
          widgetId: id,
          userId: seedUserId(slug, voter),
          optionId: option.id,
        });
        const voteDoc = await ctx.db.get(voteId);
        await pollTallies.insert(ctx, voteDoc!);
      }
    }
  }
  return id;
}

async function seedSpace(
  ctx: MutationCtx,
  meta: (typeof SPACES_BY_ID)[string],
  now: number,
  widgets: Widget[] = meta.widgets,
) {
  const slug = meta.id;
  const size = meta.canvasSize ?? { width: 1640, height: 1080 };
  const spaceId = await ctx.db.insert("spaces", {
    name: meta.name,
    type: meta.kind,
    icon: meta.icon,
    color: meta.color,
    slug,
    tagline: meta.tagline,
    canvasW: size.width,
    canvasH: size.height,
    createdAt: now,
    lastActivityAt: now,
  });
  await spacesCounter.inc(ctx);

  for (const member of meta.members) {
    const memberId = await ctx.db.insert("members", {
      spaceId,
      userId: seedUserId(slug, member.name),
      name: member.name,
      color: member.color,
      lastSeen: now,
    });
    const memberDoc = await ctx.db.get(memberId);
    await memberCounts.insert(ctx, memberDoc!);
  }

  const widgetIds = new Map<string, string>();
  const createdBy = seedUserId(slug, meta.members[0]?.name ?? "guest");
  for (const widget of widgets) {
    const id = await insertWidget(ctx, spaceId, slug, createdBy, widget, widget, now);
    widgetIds.set(`${slug}:${widget.id}`, id);
  }
  await linkStandings(ctx, widgetIds, slug, widgets);

  return { spaceId, widgetIds };
}

async function seedSpaceMessages(
  ctx: MutationCtx,
  meta: (typeof SPACES_BY_ID)[string],
  spaceId: Id<"spaces">,
  widgetIds: Map<string, string>,
  now: number,
) {
  const global = getGlobalThread(meta.id);
  const threads = [global, ...Object.values(getThreadsForSpace(meta.id))];
  let offset = threads.reduce((total, thread) => total + thread.messages.length, 0);
  for (const thread of threads) {
    for (const [index, message] of thread.messages.entries()) {
      const [baseThreadId, ...threadSuffix] = thread.widgetId.split("::");
      const mappedBase = widgetIds.get(`${meta.id}:${baseThreadId}`);
      const widgetId = thread.widgetId === "global"
        ? "global"
        : mappedBase
          ? [mappedBase, ...threadSuffix].join("::")
          : undefined;
      if (!widgetId) continue;
      const member = meta.members.find((candidate) => candidate.name === message.from);
      await ctx.db.insert("messages", {
        spaceId,
        widgetId: String(widgetId),
        userId: seedUserId(meta.id, message.from),
        text: message.text,
        createdAt: now - (offset - index) * 60_000,
        authorName: message.from,
        authorColor: member?.color ?? "#8b8b8b",
        promotable: message.promotable,
      });
      await messagesCounter.inc(ctx);
    }
    offset -= thread.messages.length;
  }
}

async function seedMissing(ctx: MutationCtx) {
  const now = Date.now();
  const seeded: string[] = [];
  for (const meta of Object.values(SPACES_BY_ID)) {
    const existing = await ctx.db
      .query("spaces")
      .withIndex("by_slug", (q) => q.eq("slug", meta.id))
      .unique();
    if (existing) continue;
    const { spaceId, widgetIds } = await seedSpace(ctx, meta, now);
    await seedSpaceMessages(ctx, meta, spaceId, widgetIds, now);
    seeded.push(meta.id);
  }
  return seeded;
}

/** A standings card points at its check-in by widget id: the mock id becomes the row's. */
async function linkStandings(ctx: MutationCtx, widgetIds: Map<string, string>, slug: string, widgets: Widget[]) {
  for (const w of widgets) {
    if (w.type !== "standings") continue;
    const id = widgetIds.get(`${slug}:${w.id}`);
    const source = widgetIds.get(`${slug}:${String(w.data.source)}`);
    if (id && source) await ctx.db.patch(id as Id<"widgets">, { data: { ...(w.data as WidgetData), source } as WidgetData });
  }
}

async function seedAll(ctx: MutationCtx) {
  const now = Date.now();
  const widgetIds = new Map<string, string>();
  const spaceIds = new Map<string, Id<"spaces">>();

  for (const meta of Object.values(SPACES_BY_ID)) {
    const seeded = await seedSpace(ctx, meta, now);
    spaceIds.set(meta.id, seeded.spaceId);
    for (const [key, id] of seeded.widgetIds) widgetIds.set(key, id);
  }

  for (const meta of Object.values(SPACES_BY_ID)) {
    const spaceId = spaceIds.get(meta.id);
    if (!spaceId) continue;
    await seedSpaceMessages(ctx, meta, spaceId, widgetIds, now);
  }

  return spaceIds.get("coven") ?? null;
}

/** Seeds the demo space ("the coven": wren, theo, priya, dante, juno, kai) if it is missing. */
export const demo = internalMutation({
  args: {},
  returns: v.union(v.id("spaces"), v.null()),
  handler: async (ctx) => {
    await retireCutSpaceRows(ctx);
    await seedMissing(ctx);
    const existing = await ctx.db.query("spaces").withIndex("by_slug", (q) => q.eq("slug", "coven")).unique();
    const id = existing?._id ?? (await seedAll(ctx));
    await seedHaunt(ctx);
    return id;
  },
});

/**
 * The pets (F4). Only fills what is missing, so a re-run never touches a live pet or a tombstone:
 * - the coven gets "wisp", hungry, so the demo opens with a hint worth acting on;
 * - "the crypt" (fictional members) is a space whose wisp is already dead, with a graveyard entry and its epitaph.
 * To put a pet back in a demo state: `npx convex run familiar:fastForward '{"slug":"coven","to":"hungry"}'`.
 */
async function seedHaunt(ctx: MutationCtx) {
  const now = Date.now();
  const coven = await ctx.db.query("spaces").withIndex("by_slug", (q) => q.eq("slug", "coven")).unique();
  if (coven && !(await latestPet(ctx, coven._id))) {
    const members = await ctx.db.query("members").withIndex("by_space", (q) => q.eq("spaceId", coven._id)).take(3);
    const events = hungryEvents(now, members.map((m) => m.userId));
    const h = health(events, now);
    await ctx.db.insert("familiars", {
      spaceId: coven._id, name: "wisp", generation: 1, health: h, state: stateOf(h),
      bornAt: now - 60 * HOUR_MS, lastTickAt: now, events,
    });
  }

  let crypt = await ctx.db.query("spaces").withIndex("by_slug", (q) => q.eq("slug", "crypt")).unique();
  if (!crypt) {
    const spaceId = await ctx.db.insert("spaces", {
      name: "the crypt", type: "ongoing", icon: "🪦", color: "#6b5b69", slug: "crypt",
      tagline: "the cabin trip is over. the pet is too.", createdAt: now - 12 * DAY_MS, lastActivityAt: now - 3 * DAY_MS,
    });
    await spacesCounter.inc(ctx);
    for (const [name, color] of [["mara", "#c77dff"], ["oz", "#ff9f1c"], ["ines", "#2ec4b6"]] as const) {
      const memberId = await ctx.db.insert("members", { spaceId, userId: seedUserId("crypt", name), name, color, lastSeen: now - 5 * DAY_MS });
      await memberCounts.insert(ctx, (await ctx.db.get(memberId))!);
    }
    await ctx.db.insert("widgets", {
      spaceId, type: "note", x: 120, y: 140, w: 280, h: 165, z: 1, rotate: -2, createdBy: seedUserId("crypt", "mara"), createdAt: now - 10 * DAY_MS,
      data: { text: "cabin dates? anyone? ...", author: "mara", tone: "warm", kicker: "unanswered" },
    });
    await widgetsCounter.inc(ctx);
    crypt = await ctx.db.get(spaceId);
  }
  if (crypt && !(await latestPet(ctx, crypt._id))) {
    const born = now - 9 * DAY_MS;
    const died = now - 1 * DAY_MS;
    await ctx.db.insert("familiars", {
      spaceId: crypt._id, name: "wisp", generation: 1, health: 0, state: "dead",
      bornAt: born, zeroSince: died - DEAD_AFTER_MS, diedAt: died, lastTickAt: died, events: [],
    });
    await ctx.db.insert("graveyard", {
      spaceId: crypt._id, kind: "pet", name: "wisp", epitaph: "it waited by the poll. nobody came.",
      born, died, cause: "nobody came back after the cabin trip",
    });
  }
}

export const reset = internalMutation({
  args: {},
  returns: v.union(v.id("spaces"), v.null()),
  handler: async (ctx) => {
    // Wiping every table means every sharded-counter total goes to zero too,
    // so reset directly instead of decrementing per deleted row.
    await spacesCounter.reset(ctx);
    await widgetsCounter.reset(ctx);
    await messagesCounter.reset(ctx);
    for (const table of ["messages", "votes", "paintMarks", "presence", "widgets", "members", "spaces", "recaps"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
        if (table === "votes") await pollTallies.delete(ctx, row as Doc<"votes">);
        if (table === "members") await memberCounts.delete(ctx, row as Doc<"members">);
      }
    }
    return seedAll(ctx);
  },
});

/**
 * R4: name-only choice rows already in the database get their person's seat. A seeded room maps a name to its seeded
 * cast (seed: ids, which no visitor can hold); a made room to the one member with that name (two with it: left as
 * is, and the gate asks). Tour rooms without a cast are left alone. One page per run, it schedules the next.
 */
export const backfillSeatIds = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), stamped: v.optional(v.number()), seen: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { cursor = null, stamped = 0, seen = 0 }) => {
    const page = await ctx.db.query("widgets").paginate({ cursor, numItems: 100 });
    const rosters = new Map<string, ((name: string) => string | null) | null>();
    for (const w of page.page) {
      if (!["expenseSplit", "rsvp", "checkIn", "potluck"].includes(w.type)) continue;
      seen++;
      if (!rosters.has(w.spaceId)) {
        const space = await ctx.db.get(w.spaceId);
        const members = await ctx.db.query("members").withIndex("by_space", (q) => q.eq("spaceId", w.spaceId)).take(500);
        const cast = members.filter((m) => m.userId.startsWith("seed:"));
        const pool = cast.length ? cast : space?.ownerId ? members : [];
        rosters.set(w.spaceId, pool.length ? (name) => { const hit = pool.filter((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase()); return hit.length === 1 ? hit[0].userId : null; } : null);
      }
      const id = rosters.get(w.spaceId);
      const next = id && stampSeats(w.type, w.data as Record<string, unknown>, id);
      if (!next) continue;
      await ctx.db.patch(w._id, { data: next as Doc<"widgets">["data"] });
      stamped++;
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.seed.backfillSeatIds, { cursor: page.continueCursor, stamped, seen });
    else console.log(`backfillSeatIds: ${stamped} of ${seen} choice cards stamped`);
    return null;
  },
});
