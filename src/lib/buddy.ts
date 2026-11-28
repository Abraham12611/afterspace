/** Buddy list status (F1). Pure: the caller owns the clock. */

export type BuddyStatus = "online" | "away" | "offline";

export const AWAY_MESSAGE_MAX = 80;
/** A hidden tab counts as away after this long. */
export const IDLE_AFTER_MS = 2 * 60 * 1000;

export type BuddyInput = { online: boolean; awayMessage?: string; idleSince?: number };

/** online = a live heartbeat; away = a manual message, or the tab hidden for 2 minutes. */
export function buddyStatus(buddy: BuddyInput): BuddyStatus {
  if (!buddy.online) return "offline";
  if (buddy.awayMessage && buddy.awayMessage.trim()) return "away";
  if (buddy.idleSince !== undefined) return "away";
  return "online";
}

/** Trim, collapse whitespace, cap at 80. Empty means "nothing to set". */
export function cleanAwayMessage(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, AWAY_MESSAGE_MAX);
}

export type DoorEvent = "join" | "leave";

/** Door sounds for others only: someone who was not here is now (join), or the reverse (leave). */
export function doorEvents(
  previous: ReadonlyMap<string, boolean>,
  current: ReadonlyMap<string, boolean>,
  selfId: string,
): DoorEvent[] {
  const events: DoorEvent[] = [];
  for (const [id, online] of current) {
    if (id === selfId || !previous.has(id)) continue;
    const was = previous.get(id) === true;
    if (online && !was) events.push("join");
    if (!online && was) events.push("leave");
  }
  return events;
}
