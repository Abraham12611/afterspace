import { v, type Infer } from "convex/values";

/**
 * Typed shapes for `widgets.data`, keyed by the widget's `type` field.
 * Reverse-engineered from every producer (seed.ts, widgetDefaults.ts,
 * WidgetEditorPanel.tsx) and cross-checked against the live shape of every
 * widget on the deployment.
 *
 * The core types with backend logic come first; the lighter-weight
 * "long tail" types follow. Every type in `src/data/types.ts` has an arm, and
 * every producer payload validates against one, so nothing we ship reaches the
 * permissive record at the end of the union. See the note above
 * `fallbackData` for the two reasons it is still there.
 *
 * The union itself is at the bottom of the file, in order: poll, note,
 * decision, countdown, letter, photoWall, expenseSplit, itinerary, potluck,
 * rsvp, dailyQ (the core types, defined first), then frame, sticker, media,
 * availability, playlist, jokeRegistry, messageWall, chat, quote, weather,
 * sports, wheel, dualClock, cozyColor, checkIn, standings, and `fallbackData`
 * last. `convex/schema.ts` uses it as the validator for `widgets.data`.
 */

const pollData = v.object({
  question: v.string(),
  options: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      votes: v.number(),
      total: v.number(),
      voters: v.optional(v.array(v.string())),
    }),
  ),
  waitingOn: v.optional(v.array(v.string())),
  tone: v.optional(v.string()),
  // the vote's rules (src/lib/pollRules.ts): when it closes, a local "YYYY-MM-DDTHH:MM" like a check-in's revealAt; the votes an option needs to pass
  closesAt: v.optional(v.string()),
  needs: v.optional(v.number()),
});

const noteData = v.object({
  text: v.string(),
  author: v.optional(v.string()),
  tone: v.optional(v.string()),
  kicker: v.optional(v.string()),
  title: v.optional(v.string()),
  pin: v.optional(v.boolean()),
  remembered: v.optional(v.boolean()),
  promoted: v.optional(v.boolean()),
});

// Doubles as the "decision made" card promoted from a chat message
// (convex/messages.ts promoteMessage) — promotedFromMessageId dedupes it.
const decisionData = v.object({
  title: v.optional(v.string()),
  detail: v.optional(v.string()),
  author: v.optional(v.string()),
  source: v.optional(v.string()),
  tone: v.optional(v.string()),
  promotedFromMessageId: v.optional(v.id("messages")),
});

const countdownData = v.object({
  event: v.optional(v.string()),
  targetDate: v.optional(v.string()),
  startDate: v.optional(v.string()),
  hyped: v.optional(v.array(v.string())),
  tone: v.optional(v.string()),
  // who set the date by hand (the editor); a voice edit moving it asks them first (choiceVotes.ts)
  dateBy: v.optional(v.object({ id: v.optional(v.string()), name: v.string() })),
});

// Mail-sourced letters set fromAddress + unfiled; seeded ones don't.
// `because` is the router's one-line reason, shown on the flap (B1).
const letterData = v.object({
  from: v.optional(v.string()),
  fromAddress: v.optional(v.string()),
  subject: v.optional(v.string()),
  text: v.optional(v.string()),
  receivedAt: v.optional(v.number()),
  sealed: v.optional(v.boolean()),
  unfiled: v.optional(v.boolean()),
  because: v.optional(v.string()),
});

const photoWallData = v.object({
  title: v.optional(v.string()),
  tone: v.optional(v.string()),
  photos: v.array(
    v.object({
      caption: v.string(),
      date: v.string(),
      rotate: v.number(),
      by: v.optional(v.string()),
      focus: v.optional(v.string()),
      src: v.optional(v.string()),
      thumbnailSrc: v.optional(v.string()),
      // Set only by convex/photos.ts addPhoto (uploaded prints, not seeds).
      id: v.optional(v.id("_storage")),
      addedAt: v.optional(v.number()),
    }),
  ),
});

const expenseSplitData = v.object({
  title: v.string(),
  total: v.number(),
  // userId: the payer's seat where known (links.ts splitAmong, seeds); a row with only a name is nobody's own (R4)
  splits: v.array(v.object({ name: v.string(), userId: v.optional(v.string()), owes: v.number(), paid: v.number() })),
  kicker: v.optional(v.string()),
  lastEmail: v.optional(
    v.object({
      who: v.string(),
      amount: v.number(),
      label: v.string(),
      because: v.optional(v.string()),
    }),
  ),
});

const itineraryData = v.object({
  title: v.string(),
  days: v.array(v.object({ day: v.string(), plan: v.string() })),
  lastEmail: v.optional(
    v.object({ day: v.string(), plan: v.string(), because: v.optional(v.string()) }),
  ),
});

// claimItem (convex/widgets.ts) toggles claimed/by/byUserId per item.
const potluckData = v.object({
  title: v.string(),
  kicker: v.optional(v.string()),
  tone: v.optional(v.string()),
  items: v.array(
    v.object({
      name: v.string(),
      claimed: v.boolean(),
      by: v.optional(v.union(v.string(), v.null())),
      byUserId: v.optional(v.string()),
    }),
  ),
  openCount: v.optional(v.number()),
});

// One row per person, keyed by `userId` — an RSVP is "who said yes", so a
// second browser has to be a second row, not an overwrite. Seeded rows have
// no userId and read as everybody else (LiveSpace.tsx).
const rsvpData = v.object({
  title: v.string(),
  responses: v.array(
    v.object({
      name: v.string(),
      status: v.union(v.literal("yes"), v.literal("maybe"), v.literal("no")),
      userId: v.optional(v.string()),
    }),
  ),
  waitingOn: v.optional(v.array(v.string())),
  waitingNote: v.optional(v.string()),
  tone: v.optional(v.string()),
});

const dailyQData = v.object({
  question: v.string(),
  tone: v.optional(v.string()),
  streak: v.optional(v.number()),
  youAnswered: v.optional(v.boolean()),
  waitingOn: v.optional(v.array(v.string())),
  // Same rule as rsvp: one answer per identity, so `userId` is the key and a
  // second browser is a second person. `reactions` stays the seeded emoji →
  // names tally; live reactions go in `reactedBy` (userId → emoji) so one
  // person can only hold one reaction per answer. The two are folded together
  // for render in LiveSpace.tsx.
  answers: v.array(
    v.object({
      name: v.string(),
      text: v.string(),
      userId: v.optional(v.string()),
      reactions: v.optional(v.record(v.string(), v.array(v.string()))),
      reactedBy: v.optional(v.record(v.string(), v.string())),
    }),
  ),
  history: v.optional(
    v.array(
      v.object({
        day: v.string(),
        question: v.string(),
        topAnswer: v.object({ name: v.string(), text: v.string() }),
        count: v.number(),
      }),
    ),
  ),
});


// ---------------------------------------------------------------------------
// Long tail — light widgets with no shared backend logic. Typed anyway so the
// union describes what we actually ship. Only fields present on every live
// instance are required; the rest are optional.
// ---------------------------------------------------------------------------

const frameData = v.object({
  title: v.string(),
  subtitle: v.string(),
  deco: v.optional(v.string()),
});

const stickerData = v.object({ stickerId: v.string() });

// Seeded prints carry both paths; a fresh "photo" added from the picker is
// caption + date only until someone points it at an image.
const mediaData = v.object({
  caption: v.string(),
  date: v.string(),
  src: v.optional(v.string()),
  thumbnailSrc: v.optional(v.string()),
});

const availabilityData = v.object({
  title: v.string(),
  tone: v.string(),
  best: v.string(),
  days: v.array(v.string()),
  members: v.array(
    v.object({ name: v.string(), slots: v.array(v.boolean()) }),
  ),
});

// `tone` is absent on the seeded rows but written by both the picker's fresh
// payload and the editor panel — optional, not missing.
const playlistData = v.object({
  title: v.string(),
  stationId: v.string(),
  playing: v.boolean(),
  playedBy: v.string(),
  vibes: v.array(v.string()),
  tone: v.optional(v.string()),
});

const jokeRegistryData = v.object({
  title: v.string(),
  jokes: v.array(v.object({ text: v.string(), votes: v.number() })),
});

const messageWallData = v.object({
  title: v.string(),
  messages: v.array(v.object({ from: v.string(), text: v.string() })),
});

// The prototype chat card. Real chat lives in the `messages` table; this holds
// only the canned transcript the card renders before it is wired to a thread.
const chatData = v.object({
  messages: v.array(
    v.object({
      from: v.string(),
      text: v.string(),
      time: v.optional(v.string()),
      promotable: v.optional(v.boolean()),
    }),
  ),
});

const quoteData = v.object({
  text: v.string(),
  author: v.string(),
  week: v.string(),
});

const weatherData = v.object({
  event: v.string(),
  date: v.string(),
  temp: v.number(),
  condition: v.string(),
  note: v.string(),
});

const sportsTeam = v.object({
  team: v.string(),
  score: v.number(),
  color: v.string(),
});

const sportsData = v.object({
  sport: v.string(),
  status: v.string(),
  clock: v.string(),
  quarter: v.string(),
  home: sportsTeam,
  away: sportsTeam,
});

const wheelData = v.object({
  title: v.string(),
  tone: v.string(),
  slices: v.array(v.object({ id: v.string(), label: v.string() })),
  resultIndex: v.number(),
  spinNonce: v.number(),
  spunBy: v.string(),
});

const dualClockFace = v.object({ label: v.string(), tz: v.string() });

const dualClockData = v.object({
  title: v.string(),
  left: dualClockFace,
  right: dualClockFace,
});

const cozyColorData = v.object({ title: v.string(), src: v.string() });

// A challenge the group is in together (src/lib/challenge.ts). The check-in
// holds the data, one row of daily numbers per person; standings is only a
// pointer at a check-in and ranks it on every render.
export const checkInData = v.object({
  title: v.string(),
  kind: v.union(v.literal("number"), v.literal("done")),
  unit: v.string(),
  start: v.string(),
  days: v.number(),
  revealAt: v.optional(v.string()),
  goal: v.optional(v.number()),
  // userId: stamped on a person's first log (checkIns.ts), so a second seat with the same name can't log or be asked as them
  people: v.array(v.object({ name: v.string(), color: v.string(), userId: v.optional(v.string()) })),
  logs: v.record(v.string(), v.array(v.union(v.number(), v.null()))),
});

const standingsData = v.object({
  title: v.string(),
  source: v.string(),
  stake: v.optional(v.string()),
});

// The spirit board (F5): a question, 2-6 answers on an arc, and the lock state.
// `dwell` is the server's running count (convex/spiritBoard.ts); `locked` is set once
// 2+ hands rested on one answer for 3 s.
const spiritBoardData = v.object({
  question: v.string(),
  answers: v.array(v.object({ id: v.string(), label: v.string() })),
  dwell: v.optional(v.object({ answer: v.number(), since: v.number(), seen: v.number() })),
  locked: v.optional(v.object({ index: v.number(), answer: v.string(), at: v.number(), hands: v.array(v.string()) })),
});

// Last resort. Nothing we ship lands here: all 32 types in src/data/types.ts
// have an arm above, and every producer payload (seed, picker defaults, editor
// panel) was replayed against the typed arms alone and
// passed. It stays for the two cases the arms can't cover:
//   1. `widgets.updateWidgetData` and `questions.setQuestions` patch a widget
//      by id without checking its `type`, so a shape can drift off-arm.
//   2. Rows written to prod before this union landed can't be inspected from
//      dev, and a row that fails validation blocks the deploy, not just the
//      write.
// Verify prod's widget shapes, then delete this arm and its union entry.
const fallbackData = v.record(v.string(), v.any());

export const widgetDataValidator = v.union(
  pollData,
  noteData,
  decisionData,
  countdownData,
  letterData,
  photoWallData,
  expenseSplitData,
  itineraryData,
  potluckData,
  rsvpData,
  dailyQData,
  frameData,
  stickerData,
  mediaData,
  availabilityData,
  playlistData,
  jokeRegistryData,
  messageWallData,
  chatData,
  quoteData,
  weatherData,
  sportsData,
  wheelData,
  dualClockData,
  cozyColorData,
  checkInData,
  standingsData,
  spiritBoardData,
  fallbackData,
);

// Per-type TS shapes for call sites that read/write one widget type's data
// generically (the sibling `type` field isn't a literal tag inside `data`,
// so TS can't narrow the union just from a `widget.type === "..."` check —
// cast through these at the point the code already knows the type by
// convention).
export type PollData = Infer<typeof pollData>;
export type CheckInWidgetData = Infer<typeof checkInData>;
export type NoteData = Infer<typeof noteData>;
export type DecisionData = Infer<typeof decisionData>;
export type CountdownData = Infer<typeof countdownData>;
export type LetterData = Infer<typeof letterData>;
export type PhotoWallData = Infer<typeof photoWallData>;
export type ExpenseSplitData = Infer<typeof expenseSplitData>;
export type ItineraryData = Infer<typeof itineraryData>;
export type PotluckData = Infer<typeof potluckData>;
export type RsvpData = Infer<typeof rsvpData>;
export type DailyQData = Infer<typeof dailyQData>;
export type SpiritBoardData = Infer<typeof spiritBoardData>;
export type FallbackWidgetData = Infer<typeof fallbackData>;
export type WidgetData = Infer<typeof widgetDataValidator>;
