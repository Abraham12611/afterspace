export type ChatMessage = {
  id: string;
  from: string;
  fromColor?: string;
  fromEmoji?: string;
  fromAvatarUrl?: string;
  text: string;
  time: string;
  promotable?: boolean;
  /** System lines ("● you're in") land in the stream without an author row. */
  kind?: "system";
};

export type ChatThread = {
  widgetId: string;
  label: string;
  messages: ChatMessage[];
  /** Something you haven't seen — the chip shows its count. Read chips collapse to a dot. */
  unread?: boolean;
};

export const GLOBAL_THREAD: ChatThread = {
  widgetId: "global",
  label: "everyone",
  messages: [
    { id: "g1", from: "wren", text: "ok wait the movie poll is open", time: "2m" },
    { id: "g2", from: "theo", text: "claiming candles !!", time: "1m" },
    {
      id: "g3",
      from: "priya",
      text: "let's do 7pm at my place",
      time: "now",
      promotable: true,
    },
  ],
};

export const COVEN_WIDGET_THREADS: Record<string, ChatThread> = {
  "poll-movie": {
    widgetId: "poll-movie",
    label: "movie night pick?",
    unread: true,
    messages: [
      { id: "p1", from: "wren", text: "hill house or riot", time: "5m" },
      { id: "p2", from: "dante", text: "practical magic voters assemble", time: "3m" },
      { id: "p3", from: "theo", text: "i changed my vote lol", time: "1m" },
    ],
  },
  countdown: {
    widgetId: "countdown",
    label: "9 days left",
    messages: [
      { id: "c1", from: "juno", text: "that's a saturday right", time: "1h" },
      { id: "c2", from: "priya", text: "yep, soup weather", time: "45m" },
    ],
  },
  potluck: {
    widgetId: "potluck",
    label: "who's bringing what",
    messages: [
      { id: "k1", from: "theo", text: "i've got the candles", time: "2h" },
      { id: "k2", from: "kai", text: "someone take dessert, please", time: "1h" },
    ],
  },
};

export function getThreadsForSpace(_spaceId: string) {
  return COVEN_WIDGET_THREADS;
}

export function getGlobalThread(_spaceId: string) {
  return GLOBAL_THREAD;
}

export function getThread(spaceId: string, widgetId: string): ChatThread {
  if (widgetId === "global") return getGlobalThread(spaceId);
  const threads = getThreadsForSpace(spaceId);
  return (
    threads[widgetId] ?? {
      widgetId,
      label: widgetId,
      messages: [],
    }
  );
}

export function getCommentCount(spaceId: string, widgetId: string): number {
  return getThread(spaceId, widgetId).messages.length;
}
