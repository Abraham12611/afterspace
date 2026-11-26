/** Shared widget + space types for the look prototype. */

export type WidgetType =
  | "frame"
  | "sticker"
  | "countdown"
  | "poll"
  | "potluck"
  | "chat"
  | "note"
  | "media"
  | "dailyQ"
  | "rsvp"
  | "decision"
  | "availability"
  | "photoWall"
  | "playlist"
  | "jokeRegistry"
  | "expenseSplit"
  | "itinerary"
  | "messageWall"
  | "quote"
  | "weather"
  | "sports"
  | "wheel"
  | "dualClock"
  | "cozyColor"
  | "letter"
  | "checkIn"
  | "standings"
  | "game"
  | "scoreboard"
  | "keepsake";

export type Widget = {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotate?: number;
  data: Record<string, unknown>;
};

/** A poll's optional rules (src/lib/pollRules.ts): when voting closes, a local "YYYY-MM-DDTHH:MM" like a check-in's revealAt, and the votes an option needs to pass. Without them a poll is as it always was. */
export type PollRules = { closesAt?: string; needs?: number };

export type SpaceMember = {
  name: string;
  color: string;
  online: boolean;
};

export type SpaceMeta = {
  id: string;
  name: string;
  color: string;
  icon: string;
  canvasSize?: { width: number; height: number };
  activity: boolean;
  kind: "ongoing" | "event";
  tagline: string;
  preview?: string;
  showcase?: string;
  visitorCount?: number;
};

export type Space = SpaceMeta & {
  members: SpaceMember[];
  widgets: Widget[];
};

export type WidgetTemplate = {
  type: WidgetType;
  label: string;
  emoji: string;
  /** Still renders + shows in the widget lab, but hidden from the add-widget picker. */
  pickerHidden?: boolean;
};

export type SpaceTemplate = {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  widgets: WidgetTemplate[];
};
