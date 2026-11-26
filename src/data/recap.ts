/**
 * "catch me up" — the one thing a canvas structurally cannot show you.
 *
 * You can see the board's current state by looking at it. What you can't see
 * is how it got there: that hill house overtook coraline, that theo claimed
 * the candles yesterday. Change over time is invisible at any canvas size, so
 * that — and only that — is what this answers.
 *
 * It never writes to the canvas. It reports, and points at where things moved.
 * Live mode reads the cached row from convex/recap.ts. ↻ regenerates on
 * demand. The daily cron is paused until closer to the hackathon deadline.
 * Follow-up chat rides the `recap` message thread, and in live mode the
 * answer arrives token by token over /api/ask-stream (convex/streaming.ts) —
 * RECAP_STREAM_MS/CHARS pace both that and the scripted mock reveal, so the
 * two land at the same speed. Mock mode keeps the scripted lines.
 */

export type RecapLine = {
  text: string;
  /** Widget the change happened on — ringed on the canvas as the line lands. */
  widgetId?: string;
  /** Said in chat and never rescued onto the board. Click to go find it. */
  messageId?: string;
};

/** Shared follow-up thread — rides `messages.widgetId`, hidden from global chat. */
export const RECAP_THREAD_ID = "recap";

export type RecapTurn = {
  id: string;
  from: string;
  fromColor?: string;
  fromEmoji?: string;
  fromAvatarUrl?: string;
  text: string;
  isRecap: boolean;
  /** Live mode: this turn's text is arriving token by token over
      /api/ask-stream (convex/streaming.ts). The dock shows it as it lands
      instead of running the canned reveal over a finished answer. */
  streaming?: boolean;
};

export const RECAP_SINCE = "since friday";

/** Models sometimes echo Convex ids into the sentence. Never show those. */
export function cleanRecapText(text: string) {
  return text
    .replace(/\s*\(([a-z0-9]{16,})\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const RECAP_LINES: RecapLine[] = [
  {
    text: "theo claimed the candles, so two items are still open",
    widgetId: "potluck",
  },
  {
    text: "hill house pulled ahead of coraline, 3 to 1",
    widgetId: "poll-movie",
  },
  {
    text: "priya said 7pm at her place, and it's still only in chat",
    messageId: "g3",
  },
];

/** How the reveal is paced — the sequence is what makes it feel considered. */
export const RECAP_THINKING_MS = 900;
export const RECAP_LINE_MS = 300;
export const RECAP_STREAM_MS = 16;
export const RECAP_STREAM_CHARS = 2;
