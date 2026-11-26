import type { Forgot, KnowLine, RoomKnows, Told } from "../lib/roomKnows";

/**
 * MOCK FIXTURES for "what this space knows" (`?mock=1`, no backend): what
 * `convex/roomBrief.ts` `knows` returns for the demo room, written out
 * by hand against the mock boards in `spaces.ts` (the `src` ids are those
 * widgets). Live rooms never read this file. Corrections made in mock mode
 * stay on the screen that made them.
 */

const line = (section: KnowLine["section"], key: string, text: string, why: string, src: string[], more: Partial<KnowLine> = {}): KnowLine => ({ key, section, text, why, src, ...more });

const FIXTURES: Record<string, Omit<RoomKnows, "told" | "forgot" | "at">> = {
  coven: {
    room: "the coven",
    people: [
      { name: "wren", color: "#7c5cff" },
      { name: "theo", color: "#e63da8", away: true },
      { name: "priya", color: "#3d6eff" },
      { name: "dante", color: "#ff7a3d" },
      { name: "juno", color: "#13b8a6" },
      { name: "kai", color: "#c6f750" },
    ],
    lines: [
      line("who", "away:theo", "theo is away", 'the board says "theo is out this week"', []),
      line("soon", "date:dante's birthday", "days to dante's birthday", "9 days out, from the countdown", ["countdown"], { n: 9 }),
      line("decided", "poll:movie night pick?", "movie night pick: the haunting of hill house is ahead, 3 of 5", "from the poll, 5 votes in", ["poll-movie"]),
      line("decided", "rsvp:who's coming saturday", "who's coming saturday: wren, theo, priya and juno are in · kai can't · dante hasn't answered", "from the rsvp", ["rsvp"]),
      line("decided", "split:cabin deposit", "cabin deposit: 480 split between wren, theo, priya and juno", "from the split", ["expense-split"]),
      line("habits", "day:Saturday", "Saturday is our usual day", 'said in 2 places: rsvp "who\'s coming saturday", weather "saturday supper"', ["rsvp", "weather"]),
      line("habits", "payer:wren", "wren covered the most last time", 'from the split "cabin deposit"', ["expense-split"]),
      line("habits", "claims:priya", "priya takes things on: sparkling cider", "1 claim on the lists", ["potluck"]),
      line("habits", "lowercase", "we write titles in lowercase", "11 of 12 card titles", []),
      line("habits", "words", "words we use a lot: cabin, candles, saturday, soup, supper", "each one in 2 or more places", []),
      line("made", "made:1", 'poll "movie night pick?"', 'wren said "add a poll for movie night" · 3 days ago', ["poll-movie"], { status: "kept" }),
      line("made", "made:2", '"plan a surprise for dante"', "a spoken ask · 2 days ago", [], { status: "removed" }),
    ],
  },
};

/* What the demo coven has already had to say about its own page: one thing
   told, one thing crossed out, so the first look shows people are in charge. */
const SAID: Record<string, { told: Told[]; forgot: Forgot[] }> = {
  coven: {
    told: [{ id: "seed-mondays", text: "we never do mondays", by: "juno", color: "#13b8a6", at: 1 }],
    forgot: [{ key: "words", text: "words we use a lot: cabin, candles, saturday, soup, supper", by: "dante", color: "#ff7a3d", at: 1 }],
  },
};

/** The fixture page for a mock room; a room without one gets the empty state. */
export function mockRoomKnows(slug: string, roomName: string): RoomKnows {
  const f = FIXTURES[slug];
  return { room: f?.room ?? roomName, at: 0, people: f?.people ?? [], lines: f?.lines ?? [], told: SAID[slug]?.told ?? [], forgot: SAID[slug]?.forgot ?? [] };
}
