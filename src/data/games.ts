import type { Award, GamePrompt } from "../lib/games/types";

/**
 * MOCK FIXTURES for games (`?mock=1`, no backend). The prompts are written by
 * hand, and only from facts on each room's "what this space knows" page
 * (`data/roomKnows.ts`): every prompt carries the `fact` key it came from. In
 * a live room code would pick the facts and the model would only word them.
 *
 * `lean` is how the simulated players tend to vote, so a reveal reads like
 * people who know each other. It never leaves this file.
 */

export type MockPrompt = GamePrompt & { lean: Record<string, number> };

const p = (id: string, text: string, award: string, glyph: string, fact: string, from: string, lean: Record<string, number>): MockPrompt => ({ id, text, award, glyph, fact, from, lean });

export type RoomGames = {
  /** "most likely to", or the two-person twist */
  name: string;
  /** who starts it when the viewer is the invitee */
  starter: string;
  /** prompt sets; a rematch deals the next one */
  sets: MockPrompt[][];
  /** this week before today's game: points, and stickers already won */
  seed: Record<string, number>;
  seedAwards: Array<Pick<Award, "to" | "title" | "glyph" | "prompt" | "tone">>;
  /** the scoreboard's reveal / reset */
  resets: string;
};

export const ROOM_GAMES: Record<string, RoomGames> = {
  coven: {
    name: "most likely to",
    starter: "wren",
    sets: [
      [
        p("coven-candles", "light every candle in the house", "candle keeper", "???", "claims:theo", "theo claimed the candles", { theo: 6, juno: 2, wren: 1 }),
        p("coven-cider", "bring the sparkling cider again", "cider regular", "??", "claims:priya", "priya takes things on", { priya: 6, wren: 2, kai: 1 }),
        p("coven-deposit", "front the cabin deposit and never mention it", "quiet tab", "??", "payer:wren", "wren covered the most last time", { wren: 5, juno: 2, theo: 1 }),
        p("coven-rsvp", "answer \"who's coming\" the morning of", "morning-of rsvp", "?", "rsvp:who's coming saturday", "dante hasn't answered", { dante: 7, kai: 2 }),
        p("coven-mondays", "suggest a monday anyway", "monday menace", "??", "told:seed-mondays", "juno said: we never do mondays", { kai: 4, dante: 3, juno: 2, wren: 1 }),
      ],
      [
        p("coven-hill", "vote hill house for everything", "hill house lobby", "??", "poll:movie night pick?", "hill house is ahead, 3 of 5", { wren: 4, theo: 3, priya: 1 }),
        p("coven-soup", "make soup for no reason", "soup person", "??", "words", "soup: a word we use a lot", { juno: 6, wren: 2, kai: 1 }),
        p("coven-poll", "start a poll about the poll", "poll starter", "??", "made:1", "wren asked for the movie night poll", { wren: 6, priya: 2, dante: 1 }),
        p("coven-away", "be out the week of the party", "out of office", "??", "away:theo", "theo is away", { theo: 6, kai: 2 }),
        p("coven-saturday", "say \"saturday?\" before anyone asks", "saturday person", "??", "day:Saturday", "saturday is our usual day", { juno: 4, priya: 3, wren: 2 }),
      ],
    ],
    seed: { priya: 6, wren: 5, juno: 5, kai: 4, dante: 3, theo: 2 },
    seedAwards: [
      { to: "juno", title: "no mondays", glyph: "??", prompt: "most likely to veto a monday", tone: 4 },
      { to: "wren", title: "birthday week", glyph: "??", prompt: "most likely to count the days out loud", tone: 1 },
    ],
    resets: "sun 9:00",
  },
};

export const hasGames = (room: string) => Boolean(ROOM_GAMES[room]);

/** Where the games corner sits on each mock board: the game card once someone
    starts one, and the scoreboard to its right. The scoreboard is the outer
    one on purpose: the board measures its width once, so the card that is
    always there has to hold the edge. */
export const GAME_SPOTS: Record<string, { board: { x: number; y: number }; card: { x: number; y: number } }> = {
  coven: { card: { x: 1660, y: 48 }, board: { x: 2096, y: 48 } },
};

/** Hot seat, mock only: how often each simulated player gets a question about
    a roommate right. Like `lean`, it never leaves the mock. */
export const SEAT_SKILL: Record<string, Record<string, number>> = {
  coven: { priya: 0.85, juno: 0.7, theo: 0.6, wren: 0.75, dante: 0.45, kai: 0.3 },
};

/** Where a hot-seat game's keepsake is pinned: by the birthday corner in the
    coven, in a clear spot elsewhere. */
export const KEEPSAKE_SPOTS: Record<string, { x: number; y: number; rotate: number }> = {
  coven: { x: 638, y: 616, rotate: 1.4 },
};

/** Live rooms where games are on (the scoreboard card sits on the board). */
export const LIVE_GAME_ROOMS = new Set(["coven"]);
