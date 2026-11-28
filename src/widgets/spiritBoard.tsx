import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Widget } from "../data/types";
import { getDataMode } from "../live/dataMode";
import { DWELL_MS, FRESH_MS, MIN_HANDS, answerUnder, arcLayout, mean, type Pt } from "../lib/spiritBoard";
import "../styles/spirit-board.css";

/**
 * The spirit board card (F5). A question, 2-6 answers on an arc and one
 * planchette. Hold the planchette (a Right of Way hold, so the AI can't touch
 * the board meanwhile) and point: it sits at the mean of everyone's pointers.
 * Two hands resting on one answer for 3 s lock it. The server decides that
 * (convex/spiritBoard.ts); this card only shows it and asks once a second.
 */

export type SpiritBoardIdentity = { userId: string; name: string; color: string };
type Answer = { id: string; label: string };
type Data = {
  question?: string;
  answers?: Answer[];
  dwell?: { answer: number; since: number; seen: number };
  locked?: { index: number; answer: string; at: number; hands: string[] };
};

const HOME: Pt = { x: 0.5, y: 0.9 };
const RENEW_MS = 1_000;
const REPORT_MS = 500;
const KEY_STEP = 0.04;
const ZONE = (widgetId: string, userId: string) => `board:${widgetId}:${userId}`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Props = {
  widget: Widget;
  style?: CSSProperties;
  spaceId?: string;
  identity?: SpiritBoardIdentity;
  /** presence.reportZone: where this hand points, board-local 0..1, zone "board:<widget>:<member>" */
  onCursor?: (x: number, y: number, zone?: string) => void;
};

export function SpiritBoardWidget(props: Props) {
  // mock mode (the widget lab) has no backend: the board is drawn, not played
  if (getDataMode() === "mock" || !props.spaceId || !props.identity || !props.onCursor) return <BoardView {...props} hands={[]} holding={false} mine={null} />;
  return <LiveBoard {...props} identity={props.identity} onCursor={props.onCursor} spaceId={props.spaceId} />;
}

type HandView = { userId: string; name: string; color: string; x: number; y: number };

function LiveBoard({ widget, style, spaceId, identity, onCursor }: Props & { spaceId: string; identity: SpiritBoardIdentity; onCursor: NonNullable<Props["onCursor"]> }) {
  const widgetId = widget.id as Id<"widgets">;
  const space = spaceId as Id<"spaces">;
  const data = widget.data as Data;
  const locked = Boolean(data.locked);
  const rows = useQuery(api.spiritBoard.hands, { spaceId: space, widgetId });
  const hold = useMutation(api.leases.hold);
  const letGo = useMutation(api.leases.letGo);
  const lock = useMutation(api.spiritBoard.lock);
  const reopen = useMutation(api.spiritBoard.reopen);
  const [now, setNow] = useState(() => Date.now());
  const [mine, setMine] = useState<Pt | null>(null);
  const holding = mine !== null;
  const mineRef = useRef<Pt | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // a clock only while someone has a hand on it: hands older than FRESH_MS drop off
  const anyHands = holding || (rows?.length ?? 0) > 0;
  useEffect(() => {
    if (!anyHands) return;
    const t = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(t);
  }, [anyHands]);

  const send = useCallback(
    (p: Pt) => {
      mineRef.current = p;
      setMine(p);
      onCursor(p.x, p.y, ZONE(widget.id, identity.userId));
    },
    [identity.userId, onCursor, widget.id],
  );

  const grab = useCallback(
    (p: Pt) => {
      void hold({ spaceId: space, thing: widget.id, kind: "drag", userId: identity.userId, name: identity.name, color: identity.color }).catch(() => {});
      send(p);
    },
    [hold, identity.color, identity.name, identity.userId, send, space, widget.id],
  );

  const release = useCallback(() => {
    if (!mineRef.current) return;
    mineRef.current = null;
    setMine(null);
    void letGo({ spaceId: space, thing: widget.id, userId: identity.userId }).catch(() => {});
    onCursor(0, 0);
  }, [identity.userId, letGo, onCursor, space, widget.id]);

  // while a hand is on it: renew the hold and the pointer, and ask the server whether the planchette is resting
  useEffect(() => {
    if (!holding || locked) return;
    const renew = window.setInterval(() => {
      const p = mineRef.current;
      if (!p) return;
      void hold({ spaceId: space, thing: widget.id, kind: "drag", userId: identity.userId, name: identity.name, color: identity.color }).catch(() => {});
      void lock({ spaceId: space, widgetId }).catch(() => {});
    }, RENEW_MS);
    const report = window.setInterval(() => {
      const p = mineRef.current;
      if (p) onCursor(p.x, p.y, ZONE(widget.id, identity.userId));
    }, REPORT_MS);
    return () => {
      window.clearInterval(renew);
      window.clearInterval(report);
    };
  }, [holding, locked, hold, lock, onCursor, space, widget.id, widgetId, identity]);

  // the board locked (or the card went away): let go
  useEffect(() => {
    if (locked) release();
  }, [locked, release]);
  useEffect(() => () => release(), [release]);

  const pointAt = (e: PointerEvent): Pt | null => {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  const others: HandView[] = (rows ?? []).filter((h) => h.userId !== identity.userId && now - h.updatedAt <= FRESH_MS);
  const grabProps = locked
    ? {}
    : {
        onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          grab(pointAt(e) ?? mineRef.current ?? HOME);
        },
        onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
          if (!mineRef.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const p = pointAt(e);
          if (p) send(p);
        },
        onPointerUp: release,
        onPointerCancel: release,
        onLostPointerCapture: release,
        onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
          const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
          if (e.key === "Escape") return release();
          if (!d) return;
          e.preventDefault();
          const from = mineRef.current ?? HOME;
          const p = { x: clamp01(from.x + d[0] * KEY_STEP), y: clamp01(from.y + d[1] * KEY_STEP) };
          if (mineRef.current) send(p);
          else grab(p);
        },
        onBlur: release,
      };

  return (
    <BoardView
      widget={widget}
      style={style}
      hands={others}
      holding={holding}
      mine={mine}
      me={identity}
      boardRef={boardRef}
      grabProps={grabProps}
      now={now}
      onReopen={() => void reopen({ spaceId: space, widgetId }).catch(() => {})}
    />
  );
}

type ViewProps = {
  widget: Widget;
  style?: CSSProperties;
  hands: HandView[];
  holding: boolean;
  mine: Pt | null;
  me?: SpiritBoardIdentity;
  boardRef?: React.RefObject<HTMLDivElement | null>;
  grabProps?: Record<string, unknown>;
  now?: number;
  onReopen?: () => void;
};

/** The board as drawn: everything the server and the hands tell it, no hooks of its own beyond a calm ref. */
function BoardView({ widget, style, hands, holding, mine, me, boardRef, grabProps, now, onReopen }: ViewProps) {
  const data = widget.data as Data;
  const answers = data.answers ?? [];
  const layout = useMemo(() => arcLayout(Math.max(2, answers.length)), [answers.length]);
  const lockedIdx = data.locked?.index ?? null;
  const pts: Pt[] = [...hands, ...(mine ? [mine] : [])];
  const handCount = pts.length;
  const mid = lockedIdx !== null ? layout[lockedIdx] : mean(pts);
  const under = lockedIdx !== null ? lockedIdx : answerUnder(mid, layout);
  const pos = mid ?? HOME;
  const dwell = data.dwell && now !== undefined ? Math.min(1, Math.max(0, (now - data.dwell.since) / DWELL_MS)) : 0;
  const resting = lockedIdx === null && under !== null && handCount >= MIN_HANDS;
  const tags: { key: string; name: string; color: string; you?: boolean }[] = [
    ...(me && holding ? [{ key: me.userId, name: me.name, color: me.color, you: true }] : []),
    ...hands.map((h) => ({ key: h.userId, name: h.name, color: h.color })),
  ];
  const status = lockedIdx !== null
    ? "the board has spoken"
    : handCount === 0
      ? "rest your hand on the planchette"
      : handCount === 1
        ? "one hand isn't enough. get someone else on it"
        : under !== null
          ? "hold still..."
          : "move it toward an answer, together";

  return (
    <section className={`widget-shell spirit-board ${lockedIdx !== null ? "is-locked" : ""}`} style={style} aria-label={`spirit board: ${data.question ?? ""}`}>
      <h3 className="spirit-question">{data.question ?? "ask the board"}</h3>
      <div className="spirit-stage" ref={boardRef} style={{ "--dwell": dwell } as CSSProperties}>
        <ol className="spirit-answers">
          {answers.map((a, i) => (
            <li
              key={a.id}
              className={`spirit-answer ${under === i ? "is-under" : ""} ${lockedIdx === i ? "is-lit" : ""}`}
              style={{ left: `${layout[i].x * 100}%`, top: `${layout[i].y * 100}%` }}
            >
              <span>{a.label}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={`spirit-planchette ${holding ? "is-held" : ""} ${resting ? "is-resting" : ""} ${lockedIdx !== null ? "is-glowing" : ""}`}
          style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
          aria-label={lockedIdx !== null ? `the planchette rests on ${data.locked?.answer}` : "planchette: hold it and point at an answer, with someone else"}
          disabled={lockedIdx !== null || !grabProps}
          {...(grabProps ?? {})}
        >
          <img src="/mascots/planchette.png" alt="" draggable={false} />
        </button>
      </div>
      {lockedIdx !== null ? (
        <p className="spirit-result" aria-live="polite">
          <span className="spirit-result-label">it's </span>
          {Array.from(data.locked?.answer ?? "").map((ch, i) => (
            <span key={i} className="spirit-letter" style={{ "--i": i } as CSSProperties}>
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
      ) : (
        <p className="spirit-status" aria-live="polite">
          {status}
        </p>
      )}
      <ul className="spirit-hands" aria-label="hands on the board">
        {tags.map((t) => (
          <li key={t.key} style={{ "--hand": t.color } as CSSProperties}>
            {t.you ? "you" : t.name}
          </li>
        ))}
      </ul>
      {lockedIdx !== null && data.locked ? (
        <p className="spirit-note">
          {data.locked.hands.join(" + ")} agreed
          {onReopen ? (
            <button type="button" className="spirit-again" onClick={onReopen}>
              ask again
            </button>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
