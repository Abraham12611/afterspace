import { DECISION_WIDGET, getSpace } from "../data/spaces";
import type { Widget, WidgetType } from "../data/types";

export const WIDGET_BLUEPRINTS: Widget[] = [
  ...getSpace("coven").widgets,
  DECISION_WIDGET,
];

export const WIDGET_SIZES: Partial<Record<WidgetType, { w: number; h: number }>> = {
  availability: { w: 460, h: 250 },
  countdown: { w: 190, h: 250 },
  dailyQ: { w: 290, h: 235 },
  decision: { w: 320, h: 190 },
  expenseSplit: { w: 260, h: 205 },
  frame: { w: 680, h: 360 },
  itinerary: { w: 310, h: 190 },
  jokeRegistry: { w: 300, h: 200 },
  media: { w: 300, h: 220 },
  messageWall: { w: 520, h: 110 },
  note: { w: 280, h: 165 },
  photoWall: { w: 300, h: 200 },
  playlist: { w: 320, h: 176 },
  poll: { w: 250, h: 230 },
  potluck: { w: 400, h: 160 },
  quote: { w: 230, h: 120 },
  rsvp: { w: 200, h: 260 },
  sports: { w: 420, h: 280 },
  weather: { w: 230, h: 110 },
  wheel: { w: 280, h: 330 },
  spiritBoard: { w: 340, h: 400 },
  dualClock: { w: 340, h: 150 },
  cozyColor: { w: 560, h: 500 },
  checkIn: { w: 600, h: 420 },
  standings: { w: 372, h: 430 },
};

export function getWidgetBlueprint(type: WidgetType): Widget | undefined {
  return WIDGET_BLUEPRINTS.find((widget) => widget.type === type);
}

export function freshWidgetData(type: WidgetType, source: Widget["data"]): Widget["data"] {
  switch (type) {
    case "frame":
      return {
        title: "new frame",
        subtitle: "a shared corner for related widgets",
      };
    case "note":
      return {
        text: "write something your people should remember",
        author: "You",
        tone: "warm",
        kicker: "new note",
      };
    case "poll":
      return {
        question: "what should we decide?",
        options: [
          { id: "a", label: "first option", votes: 0, total: 1 },
          { id: "b", label: "second option", votes: 0, total: 1 },
          { id: "c", label: "something else", votes: 0, total: 1 },
        ],
      };
    case "media":
      return { caption: "new photo", date: "just now" };
    case "dailyQ":
      return {
        question: "what's everyone thinking?",
        tone: "butter",
        streak: 1,
        answers: [],
        waitingOn: [],
      };
    case "chat":
      return {
        messages: [
          { from: "Wren", text: "who's bringing balloons?", time: "2:04p", promotable: true },
          { from: "theo", text: "i got those", time: "2:06p" },
          { from: "priya", text: "6pm still good?", time: "2:11p" },
        ],
      };
    case "rsvp":
      return { title: "who's in?", responses: [], waitingOn: [] };
    case "decision":
      return {
        ...source,
        title: String(source.title ?? "decision made"),
        detail: String(source.detail ?? "6pm · Priya's place"),
        author: String(source.author ?? "priya"),
        source: String(source.source ?? "promoted from chat"),
        tone: String(source.tone ?? "lime"),
      };
    case "availability":
      return {
        ...source,
        title: String(source.title ?? "when can we all meet?"),
        days: Array.isArray(source.days) ? source.days : ["Fri", "Sat", "Sun"],
        members: Array.isArray(source.members)
          ? source.members
          : [
              { name: "Wren", slots: [true, false, true] },
              { name: "theo", slots: [true, true, false] },
              { name: "priya", slots: [false, true, true] },
            ],
        best: String(source.best ?? "Sat"),
        tone: String(source.tone ?? "sky"),
      };
    case "potluck":
      return {
        title: "who's bringing what",
        tone: "mint",
        items: [
          { name: "snacks", by: null, claimed: false },
          { name: "playlist", by: "theo", claimed: true },
          { name: "ice", by: null, claimed: false },
          { name: "candles", by: "priya", claimed: true },
        ],
      };

    case "playlist":
      return {
        ...source,
        title: String(source.title ?? "shared soundtrack"),
        stationId: String(source.stationId ?? "indiepop"),
        playedBy: String(source.playedBy ?? source.pickedBy ?? "theo"),
        playing: Boolean(source.playing),
        vibes: Array.isArray(source.vibes) ? source.vibes : ["wren", "priya"],
        tone: String(source.tone ?? "violet"),
      };

    case "wheel":
      return {
        title: "spin the wheel",
        tone: "mint",
        slices: [
          { id: "a", label: "first person" },
          { id: "b", label: "second person" },
          { id: "c", label: "third person" },
          { id: "d", label: "last person" },
        ],
        spinNonce: 0,
        resultIndex: 0,
        spunBy: "You",
      };
    case "spiritBoard":
      return {
        question: "where should we go?",
        answers: [
          { id: "a", label: "tahoe" },
          { id: "b", label: "big sur" },
          { id: "c", label: "stay home" },
        ],
      };
    case "dualClock":
      return {
        title: "two places",
        left: { label: "home", tz: "America/Los_Angeles" },
        right: { label: "away", tz: "Asia/Seoul" },
      };
    case "cozyColor":
      return {
        title: "same moon, both windows",
        src: "/assets/cozy-color-same-moon.png",
      };

    default:
      return { ...source };
  }
}

export function createDemoWidget(type: WidgetType, id = `lab-${type}`): Widget {
  const blueprint = getWidgetBlueprint(type);
  const size = WIDGET_SIZES[type] ?? {
    w: blueprint?.w ?? 280,
    h: blueprint?.h ?? 180,
  };

  return {
    id,
    type,
    x: 0,
    y: 0,
    w: size.w,
    h: size.h,
    z: 1,
    rotate: blueprint?.rotate,
    data: blueprint
      ? freshWidgetData(type, blueprint.data)
      : freshWidgetData(type, {}),
  };
}
