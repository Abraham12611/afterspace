import type { Space, SpaceMeta, Widget } from "./types";

export type { Widget, Space, SpaceMeta, WidgetType } from "./types";

/**
 * Demo fixtures for the mock mode (`?mock=1`, no backend) and the first seed:
 * one fictional friend group, "the coven" (wren, theo, priya, dante, juno,
 * kai). Nothing here is a real person. Seeded live rooms start from the same
 * board (convex/seed.ts).
 */

/** Local YYYY-MM-DD offset from today, so seeded countdowns stay evergreen. */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "nov 6" style, `days` from today, so seeded trip dates stay in the future. */
function monthDayFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** The cabin weekend: starts about three weeks out. Getters, so the dates are
 * read when the room is seeded or refreshed, not when this module first loaded. */
function cabinItinerary() {
  const start = 21;
  return {
    get title() {
      return `cabin weekend · ${monthDayFromNow(start)}-${monthDayFromNow(start + 2).split(" ")[1]}`;
    },
    get days() {
      return [
        { day: monthDayFromNow(start), plan: "drive up · soup on the stove" },
        { day: monthDayFromNow(start + 1), plan: "lake walk · board games" },
        { day: monthDayFromNow(start + 2), plan: "pancakes · drive back" },
      ];
    },
  };
}

/** The cast, in the order they join. */
export const COVEN_MEMBERS = [
  { name: "wren", color: "#7c5cff", online: true },
  { name: "theo", color: "#e63da8", online: true },
  { name: "priya", color: "#3d6eff", online: true },
  { name: "dante", color: "#ff7a3d", online: false },
  { name: "juno", color: "#13b8a6", online: true },
  { name: "kai", color: "#c6f750", online: false },
];

export const COVEN_WIDGETS: Widget[] = [
  {
    id: "countdown",
    type: "countdown",
    x: 48,
    y: 64,
    w: 186,
    h: 262,
    z: 2,
    rotate: -1.8,
    data: {
      event: "dante's birthday",
      get targetDate() {
        return isoDaysFromNow(9);
      },
      get startDate() {
        return isoDaysFromNow(-5);
      },
      hyped: ["wren", "theo", "priya", "juno"],
    },
  },
  {
    id: "poll-movie",
    type: "poll",
    x: 262,
    y: 80,
    w: 244,
    h: 234,
    z: 4,
    rotate: 1.3,
    data: {
      question: "movie night pick?",
      options: [
        { id: "a", label: "the haunting of hill house", votes: 3, total: 5, voters: ["wren", "theo", "priya"] },
        { id: "b", label: "coraline", votes: 1, total: 5, voters: ["juno"] },
        { id: "c", label: "practical magic", votes: 1, total: 5, voters: ["dante"] },
      ],
      waitingOn: ["kai"],
    },
  },
  {
    id: "rsvp",
    type: "rsvp",
    x: 534,
    y: 60,
    w: 196,
    h: 250,
    z: 3,
    rotate: -1.2,
    data: {
      title: "who's coming saturday",
      responses: [
        { name: "wren", status: "yes" },
        { name: "theo", status: "yes" },
        { name: "priya", status: "yes" },
        { name: "juno", status: "yes" },
        { name: "kai", status: "no" },
      ],
      waitingOn: ["dante"],
      waitingNote: "might be late, save me a seat",
    },
  },
  {
    id: "potluck",
    type: "potluck",
    x: 262,
    y: 340,
    w: 392,
    h: 158,
    z: 2,
    rotate: 0.9,
    data: {
      title: "who's bringing what",
      kicker: "saturday supper",
      tone: "violet",
      openCount: 2,
      items: [
        { name: "candles", by: "theo", claimed: true },
        { name: "playlist", by: null, claimed: false },
        { name: "sparkling cider", by: "priya", claimed: true },
        { name: "dessert", by: null, claimed: false },
      ],
    },
  },
  {
    id: "message-wall",
    type: "messageWall",
    x: 690,
    y: 334,
    w: 234,
    h: 248,
    z: 2,
    data: {
      title: "birthday messages",
      messages: [
        { from: "theo", text: "happy almost-birthday, you menace" },
        { from: "juno", text: "can't wait to see everyone" },
        { from: "kai", text: "cake first, speeches never" },
      ],
    },
  },
  {
    id: "daily-q",
    type: "dailyQ",
    x: 960,
    y: 48,
    w: 290,
    h: 238,
    z: 3,
    data: {
      question: "what's your current comfort show?",
      tone: "butter",
      streak: 12,
      waitingOn: ["kai", "juno"],
      answers: [
        { name: "wren", text: "the great british bake off", reactions: { "💜": ["theo"] } },
        { name: "theo", text: "survivor (again)" },
        { name: "priya", text: "avatar" },
      ],
      history: [
        {
          day: "yesterday",
          question: "most likely to text their ex?",
          topAnswer: { name: "priya", text: "kai. not even a debate" },
          count: 6,
        },
        {
          day: "tuesday",
          question: "song of the summer so far?",
          topAnswer: { name: "dante", text: "anything with a bass drop" },
          count: 5,
        },
      ],
    },
  },
  {
    id: "playlist",
    type: "playlist",
    x: 960,
    y: 312,
    w: 290,
    h: 176,
    z: 3,
    rotate: -1,
    data: {
      title: "now playing",
      stationId: "indiepop",
      playedBy: "theo",
      playing: false,
      vibes: ["wren", "priya", "juno"],
    },
  },
  {
    id: "quote",
    type: "quote",
    x: 1280,
    y: 48,
    w: 220,
    h: 110,
    z: 3,
    rotate: 1.5,
    data: {
      text: "we don't cancel, we reschedule emotionally",
      author: "theo",
      week: "week 29",
    },
  },
  {
    id: "weather",
    type: "weather",
    x: 1280,
    y: 182,
    w: 220,
    h: 115,
    z: 3,
    data: {
      event: "saturday supper",
      date: monthDayFromNow(4),
      temp: 61,
      condition: "cloudy",
      note: "good soup weather",
    },
  },
  {
    id: "expense-split",
    type: "expenseSplit",
    x: 1280,
    y: 314,
    w: 240,
    h: 200,
    z: 3,
    rotate: 1,
    data: {
      title: "cabin deposit",
      total: 480,
      splits: [
        { name: "wren", owes: 0, paid: 300 },
        { name: "theo", owes: 40, paid: 0 },
        { name: "priya", owes: 20, paid: 120 },
        { name: "juno", owes: 0, paid: 60 },
      ],
    },
  },
  {
    id: "note-ritual",
    type: "note",
    x: 262,
    y: 540,
    w: 260,
    h: 125,
    z: 2,
    data: {
      text: "ideas for the next full moon: tarot, soup, no phones",
      author: "juno",
      tone: "white",
      kicker: "next full moon?",
    },
  },
  {
    id: "frame-cabin",
    type: "frame",
    x: 700,
    y: 640,
    w: 430,
    h: 272,
    z: 1,
    data: {
      title: "cabin weekend",
      subtitle: "plans, who's driving, what to pack",
    },
  },
  {
    id: "itinerary",
    type: "itinerary",
    x: 734,
    y: 688,
    w: 300,
    h: 200,
    z: 2,
    rotate: 1,
    data: cabinItinerary(),
  },
];

export const SPACES: SpaceMeta[] = [
  {
    id: "coven",
    name: "the coven",
    color: "#7c5cff",
    icon: "🕯️",
    activity: false,
    kind: "ongoing",
    tagline: "your people, in one place",
    preview: "daily q · 3 answered",
    showcase: "birthday HQ · plans, polls, a cabin weekend",
  },
];

export const SPACES_BY_ID: Record<string, Space> = {
  coven: {
    ...SPACES[0],
    members: COVEN_MEMBERS,
    widgets: COVEN_WIDGETS,
  },
};

export const SPACE_CURSORS: Record<
  string,
  { name: string; color: string; x: number; y: number }[]
> = {
  coven: [
    { name: "theo", color: "#e63da8", x: 792, y: 430 },
    { name: "priya", color: "#3d6eff", x: 1096, y: 578 },
    { name: "wren", color: "#7c5cff", x: 468, y: 298 },
  ],
};

export function canvasSizeFor(id: string): { width: number; height: number } {
  return SPACES_BY_ID[id]?.canvasSize ?? { width: 1640, height: 1080 };
}

/** @deprecated use SPACES_BY_ID.coven */
export const COVEN = SPACES_BY_ID.coven;

export function getSpace(id: string): Space {
  return SPACES_BY_ID[id] ?? SPACES_BY_ID.coven;
}

export function getWidgets(id: string): Widget[] {
  return getSpace(id).widgets;
}

export const DECISION_WIDGET: Widget = {
  id: "decision-promoted",
  type: "decision",
  x: 960,
  y: 520,
  w: 290,
  h: 155,
  z: 25,
  data: {
    title: "decision made",
    detail: "saturday · priya's place",
    author: "priya",
    source: "promoted from chat",
    tone: "lime",
  },
};
