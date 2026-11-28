import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 5 minutes, not every minute: this sweep is pure housekeeping — the
// client filters cursors at a 30s TTL and getHereNow reads the fresh range, so
// nothing user-facing waits on it. At 1/min it was ~43k function calls a month
// PER deployment, dev and prod, running whether or not anyone had the app open.
crons.interval("clean stale presence", { minutes: 5 }, internal.presence.cleanup);

// Daily 15:00 UTC — bounded via the recap workpool (maxParallelism 3).
crons.cron("catch me up", "0 15 * * *", internal.recap.generateAll, {});

// 07:00 UTC = midnight Pacific — every room back to its baseline. Rooms are
// public and unlocked on purpose, so a day of visitors leaves scribble, spam
// and dragged-off widgets behind; morning starts on the board we meant to
// show. Rooms without a saved baseline are skipped, never wiped. Members and
// ownership are never touched (docs/local/admin-reset.md).
crons.cron("nightly room reset", "0 7 * * *", internal.admin.nightlyReset, {});

// Every 10 minutes — rooms with activity since their brief, and each room once
// a day (its dates say "in N days"), get a fresh brief, so a voice ask reads
// one stored row instead of the board (roomBrief.ts).
crons.interval("room briefs", { minutes: 10 }, internal.roomBrief.refreshActive, {});

// Every 30 minutes: re-score every space's pet from what people did, notice
// deaths (health 0 for 24 h -> graveyard + epitaph), revive, and bury plans
// that ended over 14 days ago (convex/familiar.ts).
crons.interval("familiar tick", { minutes: 30 }, internal.familiar.tick, {});

export default crons;
