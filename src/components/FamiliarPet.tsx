import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ageLabel, type PetState } from "../lib/familiar";
import { graveyardHash } from "../lib/routes";
import "../styles/familiar.css";

/**
 * The pet (F4): a small ghost that floats over the page. Its art follows its
 * health (public/mascots/wisp-<state>.png). Tap it for its name, age, how it
 * feels, what would help, and the way to the graveyard. When it is dead the
 * popover shows the revive: 3 different members each doing something within a day.
 *
 * `compact` is the small variant for the header (a 32 px face, same popover).
 */

const FEELS: Record<PetState, string> = {
  thriving: "thriving",
  okay: "doing okay",
  hungry: "hungry",
  fading: "fading",
  dead: "gone",
};

type Props = { spaceId: Id<"spaces">; slug: string; compact?: boolean };

export function FamiliarPet({ spaceId, slug, compact = false }: Props) {
  const pet = useQuery(api.familiar.forSpace, { spaceId });
  const ensure = useMutation(api.familiar.ensure);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const root = useRef<HTMLDivElement>(null);

  // a space with no pet yet gets one (the 30 min tick would too)
  useEffect(() => {
    if (pet === null) void ensure({ spaceId }).catch(() => {});
  }, [pet, ensure, spaceId]);

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!pet) return null;
  const name = pet.name;

  return (
    <div ref={root} className={`familiar ${compact ? "is-compact" : ""} is-${pet.state}`} data-testid="familiar">
      <button
        type="button"
        className="familiar-body"
        aria-expanded={open}
        aria-label={`${name}, your space's pet, ${FEELS[pet.state]}. tap to open`}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={`/mascots/wisp-${pet.state}.png`} alt="" draggable={false} />
      </button>
      {open ? (
        <div className="familiar-pop" role="dialog" aria-label={`${name}`}>
          <p className="familiar-name">
            {name}
            <span className="familiar-feel"> · {FEELS[pet.state]}</span>
          </p>
          <p className="familiar-age">
            {pet.state === "dead" && pet.diedAt ? `lived ${ageLabel(pet.bornAt, pet.diedAt)}` : `${ageLabel(pet.bornAt, now)} old`}
          </p>
          {pet.state !== "dead" ? (
            <div className="familiar-meter" role="img" aria-label={`health ${pet.health} of 100`}>
              <span style={{ width: `${pet.health}%` }} />
            </div>
          ) : null}
          {pet.hint ? <p className="familiar-hint">{pet.hint}</p> : null}
          {pet.revive ? (
            <div className="familiar-revive">
              <p>bring it back: {pet.revive.need} of you each do something today.</p>
              <ol className="familiar-pips" aria-label={`${pet.revive.have} of ${pet.revive.need} here`}>
                {Array.from({ length: pet.revive.need }, (_, i) => (
                  <li key={i} className={i < pet.revive!.have ? "is-on" : ""} />
                ))}
              </ol>
              <p className="familiar-count">
                {pet.revive.have} of {pet.revive.need}
              </p>
            </div>
          ) : null}
          <a className="familiar-grave" href={graveyardHash(slug)}>
            the graveyard
          </a>
        </div>
      ) : null}
    </div>
  );
}
