import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { seatOf } from "./seat";
import { v } from "convex/values";
import type { PhotoWallData } from "./widgetData";
import { touchSpace } from "./activity";

/** Client uploads the image bytes straight to storage via this URL. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // a signed-in browser only (S3): not an open bucket
    if (!(await getAuthUserId(ctx))) throw new Error("sign in first");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Uploaded bytes → a public url any widget can persist in its data. */
export const storageUrl = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { storageId }) => ((await getAuthUserId(ctx)) ? await ctx.storage.getUrl(storageId) : null),
});

/* Each new print lands with its own tilt so the pile stays organic. */
const PIN_TILTS = [-3, 2, -2, 3, -4, 4];

/** Pin an uploaded photo to the front of a memory wall — it becomes the
 *  cover of the pile and the hero of the room on every screen at once. */
export const addPhoto = mutation({
  args: {
    widgetId: v.id("widgets"),
    spaceId: v.id("spaces"),
    storageId: v.id("_storage"),
    caption: v.string(),
    /** Ignored: the pin is the caller's seat (S3). */
    by: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { widgetId, spaceId, storageId, caption }) => {
    const me = await seatOf(ctx, spaceId);
    if (!me) throw new Error("not in this room");
    const by = me.name;
    const widget = await ctx.db.get(widgetId);
    // Space-scoped like paint.addStroke. Without the spaceId clause an
    // anonymous visitor could pin an uploaded image to the FRONT of any
    // space's photo wall (photos are prepended, so index 0 is the cover).
    if (!widget || widget.spaceId !== spaceId || widget.type !== "photoWall") {
      throw new Error("Not a photo wall");
    }
    const src = await ctx.storage.getUrl(storageId);
    if (!src) throw new Error("Uploaded file not found");

    const now = Date.now();
    const photoWallData = widget.data as PhotoWallData;
    const photos = Array.isArray(photoWallData?.photos) ? photoWallData.photos : [];
    const date = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    })
      .format(new Date(now))
      .toLowerCase();

    const photo = {
      id: storageId,
      caption: caption.trim() || "new moment",
      date,
      by,
      rotate: PIN_TILTS[photos.length % PIN_TILTS.length],
      src,
      thumbnailSrc: src,
      addedAt: now,
    };
    await ctx.db.patch(widget._id, {
      data: { ...photoWallData, photos: [photo, ...photos] },
    });
    await touchSpace(ctx, spaceId, now);
    return null;
  },
});
