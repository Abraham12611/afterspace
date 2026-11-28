import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AWAY_MESSAGE_MAX, IDLE_AFTER_MS, buddyStatus, cleanAwayMessage, doorEvents, type BuddyStatus } from "../lib/buddy";
import { getDoorSoundEnabled, playDoor, setDoorSoundEnabled, subscribeDoorSound } from "../lib/sounds";
import { MemberFace } from "./MemberFace";
import "../styles/buddy-list.css";

/**
 * F1: the buddy list. A small floating window (a bottom sheet on phones) with
 * everyone in the space as online, away (with their away message) or offline.
 * Your own row opens the away popover. Others arriving and leaving play a door
 * sound, once sound is turned on.
 *
 * Who is "here" is the presence component's room `buddy:<space>`, beaten from
 * this tab below; the server reads the person from the session, not from us.
 */

const BEAT_MS = 15_000;
const PRESETS = ["brb", "making tea", "at the dentist", "asleep, leave a letter", "out haunting"];
const SECTIONS: { status: BuddyStatus; title: string }[] = [
  { status: "online", title: "here" },
  { status: "away", title: "away" },
  { status: "offline", title: "gone" },
];

function useBuddyBeat(spaceId: Id<"spaces">) {
  const convex = useConvex();
  const beat = useMutation(api.roomPresence.buddyBeat);
  const setIdle = useMutation(api.presence.setIdle);
  const sessionToken = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = crypto.randomUUID();
    let idleTimer: number | null = null;
    let idleSent = false;
    let stopped = false;

    const send = () => {
      void beat({ spaceId, sessionId, hidden: document.hidden })
        .then((result) => {
          if (!stopped && result) sessionToken.current = result.sessionToken;
        })
        .catch(() => {});
    };
    const onVisibility = () => {
      send();
      if (document.hidden) {
        idleTimer = window.setTimeout(() => {
          idleSent = true;
          void setIdle({ spaceId, idle: true }).catch(() => {});
        }, IDLE_AFTER_MS);
      } else {
        if (idleTimer !== null) window.clearTimeout(idleTimer);
        idleTimer = null;
        if (idleSent) {
          idleSent = false;
          void setIdle({ spaceId, idle: false }).catch(() => {});
        }
      }
    };
    // Closing the tab: tell the server now rather than let the 30s window run out.
    const onLeave = () => {
      if (!sessionToken.current) return;
      const body = new Blob([JSON.stringify({ path: "presence:disconnect", args: { sessionToken: sessionToken.current } })], {
        type: "application/json",
      });
      navigator.sendBeacon(`${convex.url}/api/mutation`, body);
    };

    send();
    const interval = window.setInterval(send, BEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, [beat, convex, setIdle, spaceId]);
}

export function BuddyList({ spaceId, selfUserId }: { spaceId: Id<"spaces">; selfUserId: string }) {
  useBuddyBeat(spaceId);
  const buddies = useQuery(api.presence.buddyList, { spaceId });
  const setAway = useMutation(api.presence.setAway);
  const clearAway = useMutation(api.presence.clearAway);
  const soundOn = useSyncExternalStore(subscribeDoorSound, getDoorSoundEnabled, () => false);

  const [minimized, setMinimized] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [awayOpen, setAwayOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const windowRef = useRef<HTMLElement>(null);

  const rows = useMemo(
    () =>
      (buddies ?? []).map((buddy) => ({
        ...buddy,
        status: buddyStatus(buddy),
        isSelf: buddy.userId === selfUserId,
      })),
    [buddies, selfUserId],
  );

  // door sounds: others only, never on the first snapshot
  const lastOnline = useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    if (!buddies) return;
    const current = new Map(buddies.map((b) => [b.userId, b.online]));
    if (lastOnline.current) {
      for (const event of doorEvents(lastOnline.current, current, selfUserId)) playDoor(event === "join" ? "creak" : "close");
    }
    lastOnline.current = current;
  }, [buddies, selfUserId]);

  useEffect(() => {
    if (!awayOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAwayOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!windowRef.current?.querySelector(".buddy-away")?.contains(event.target as Node) && !(event.target as HTMLElement).closest?.(".buddy-row-self")) {
        setAwayOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [awayOpen]);

  const me = rows.find((row) => row.isSelf);
  const onlineCount = rows.filter((row) => row.status !== "offline").length;

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start) return;
    // keep the window on screen: it sits bottom-right, so it can move up and left, a little right and down
    const maxLeft = Math.max(0, window.innerWidth - 300);
    const maxUp = Math.max(0, window.innerHeight - 120);
    setOffset({
      x: Math.min(24, Math.max(-maxLeft, start.ox + event.clientX - start.x)),
      y: Math.min(24, Math.max(-maxUp, start.oy + event.clientY - start.y)),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const choose = async (message: string) => {
    const clean = cleanAwayMessage(message);
    if (!clean) {
      setError("say where you went");
      return;
    }
    setError("");
    try {
      await setAway({ spaceId, message: clean });
      setDraft("");
      setAwayOpen(false);
    } catch {
      setError("couldn't set that, try again");
    }
  };
  const back = async () => {
    setError("");
    try {
      await clearAway({ spaceId });
      setAwayOpen(false);
    } catch {
      setError("couldn't clear that, try again");
    }
  };

  if (buddies === undefined) return null;

  return (
    <aside
      ref={windowRef}
      className={`buddy-list ${minimized ? "is-minimized" : ""}`}
      style={{ "--buddy-x": `${offset.x}px`, "--buddy-y": `${offset.y}px` } as CSSProperties}
      aria-label="buddy list"
    >
      <div className="buddy-titlebar" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <span className="buddy-title font-pixel">buddy list</span>
        <span className="buddy-count font-pixel" aria-label={`${onlineCount} here`}>
          {onlineCount}/{rows.length}
        </span>
        <button
          type="button"
          className="buddy-min"
          aria-expanded={!minimized}
          aria-label={minimized ? "open the buddy list" : "minimize the buddy list"}
          onClick={() => setMinimized((value) => !value)}
        >
          <span aria-hidden="true">{minimized ? "▢" : "–"}</span>
        </button>
      </div>

      {!minimized && (
        <div className="buddy-body">
          {SECTIONS.map(({ status, title }) => {
            const group = rows
              .filter((row) => row.status === status)
              .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name));
            if (!group.length) return null;
            return (
              <section key={status} className="buddy-section" aria-label={title}>
                <h3 className="buddy-section-title font-pixel">
                  {title} ({group.length})
                </h3>
                <ul>
                  {group.map((row) => (
                    <li key={row.userId} className={`buddy-row is-${row.status} ${row.isSelf ? "buddy-row-self" : ""}`}>
                      <span className="buddy-face">
                        <MemberFace name={row.name} emoji={row.emoji} color={row.color} avatarUrl={row.avatarUrl} size="sm" />
                        {row.status === "away" && <img className="buddy-bones" src="/mascots/bones.png" alt="" width={18} height={18} />}
                      </span>
                      {row.isSelf ? (
                        <button
                          type="button"
                          className="buddy-main"
                          aria-expanded={awayOpen}
                          onClick={() => {
                            setDraft(me?.awayMessage ?? "");
                            setAwayOpen((value) => !value);
                          }}
                        >
                          <span className="buddy-name font-pixel">{row.name.toLowerCase()} (you)</span>
                          <span className="buddy-away-line">{row.awayMessage ?? (row.status === "away" ? "idle" : "set an away message")}</span>
                        </button>
                      ) : (
                        <span className="buddy-main">
                          <span className="buddy-name font-pixel">{row.name.toLowerCase()}</span>
                          {row.awayMessage && <span className="buddy-away-line">{row.awayMessage}</span>}
                          {!row.awayMessage && row.status === "away" && <span className="buddy-away-line">idle</span>}
                        </span>
                      )}
                      {!row.isSelf && (
                        <button type="button" className="buddy-letter" aria-disabled="true" title="letters arrive soon">
                          write a letter
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {rows.length === 0 && <p className="buddy-empty">nobody's here yet</p>}

          {awayOpen && (
            <form
              className="buddy-away"
              onSubmit={(event) => {
                event.preventDefault();
                void choose(draft);
              }}
            >
              <label className="buddy-away-label" htmlFor="buddy-away-input">
                away message
              </label>
              <input
                id="buddy-away-input"
                value={draft}
                maxLength={AWAY_MESSAGE_MAX}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="where did you go?"
                autoComplete="off"
              />
              <div className="buddy-presets">
                {PRESETS.map((preset) => (
                  <button key={preset} type="button" onClick={() => void choose(preset)}>
                    {preset}
                  </button>
                ))}
              </div>
              {error && <p className="buddy-error" role="alert">{error}</p>}
              <div className="buddy-away-actions">
                <button type="submit" className="buddy-set">set away</button>
                {(me?.awayMessage || me?.idleSince !== undefined) && (
                  <button type="button" className="buddy-back" onClick={() => void back()}>
                    i'm back
                  </button>
                )}
              </div>
            </form>
          )}

          <button type="button" className="buddy-sound" role="switch" aria-checked={soundOn} onClick={() => setDoorSoundEnabled(!soundOn)}>
            <img src={soundOn ? "/ui/toggle-on.png" : "/ui/toggle-off.png"} alt="" width={36} height={20} />
            <span>door sounds</span>
          </button>
        </div>
      )}
    </aside>
  );
}
