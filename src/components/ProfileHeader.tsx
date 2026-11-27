import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { MemberFace } from "./MemberFace";

/**
 * The profile header band at the top of a space (P2.4, docs/plan/02-design/layout-changes.md):
 * wordmark, the space's name and mood line, its pet, Top 8, a visitor counter and the
 * profile song. Real Top 8, visitors and song arrive in P3; until then Top 8 is the
 * space's member list, the counter is the local demo count, and the song is a slot.
 *
 * `SpaceHeader` (Canvas.tsx) renders this and passes its own handles (edit, grimoire
 * door) and side (presence, add, invite), so the invite logic stays where it was.
 */
export type ProfileFace = { key: string; name: string; emoji?: string; color?: string; avatarUrl?: string };

const TOP_SLOTS = 8;

function counterDigits(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(6, "0").slice(-6);
}

export function ProfileHeader({
  headerRef,
  entering = false,
  name,
  kind,
  tagline,
  top8,
  visitors,
  handles,
  side,
}: {
  headerRef?: Ref<HTMLDivElement>;
  entering?: boolean;
  name: string;
  kind?: string;
  tagline?: string;
  top8: ProfileFace[];
  visitors: number;
  /** quiet chips under the name: edit, the grimoire */
  handles?: ReactNode;
  /** who's here and the header actions (add, invite) */
  side?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const faces = top8.slice(0, TOP_SLOTS);
  const empty = Math.max(0, TOP_SLOTS - faces.length);
  const digits = counterDigits(visitors);

  return (
    <div ref={headerRef} className={`space-header profile-header ${entering ? "is-entering" : ""} ${open ? "is-open" : ""}`}>
      <a className="profile-wordmark" href="#/about" aria-label="about afterspace">
        <img src="/brand/wordmark-96.png" alt="afterspace" width={113} height={24} />
      </a>

      <div className="space-title-block profile-id">
        <img className="profile-pet" src="/mascots/wisp-thriving.png" alt="" width={56} height={56} />
        <div className="profile-id-text">
          {kind && (
            <div className="space-meta">
              <span className="space-kind">{kind}</span>
            </div>
          )}
          <div className="space-title-row">
            <h1>
              <span className="space-title-text">{name}</span>
            </h1>
          </div>
          <p className="profile-mood">
            <span className="profile-mood-label">mood:</span> {tagline || "here, mostly"}
          </p>
          {handles && <div className="space-title-handles">{handles}</div>}
        </div>
        <button
          type="button"
          className="profile-more"
          aria-expanded={open}
          aria-controls="profile-extras"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "hide top 8 and visitors" : "show top 8 and visitors"}</span>
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      <div className="profile-extras" id="profile-extras">
        <section className="profile-top8" aria-label="top 8">
          <h2 className="profile-label">top 8</h2>
          <ol>
            {faces.map((face, index) => (
              <li key={face.key} style={{ "--i": index } as CSSProperties}>
                <MemberFace name={face.name} emoji={face.emoji} color={face.color} avatarUrl={face.avatarUrl} size="sm" />
                <span className="profile-top8-name">{face.name.toLowerCase()}</span>
              </li>
            ))}
            {Array.from({ length: empty }, (_, index) => (
              <li key={`empty-${index}`} className="is-empty" aria-hidden="true">
                <span className="profile-top8-slot" />
              </li>
            ))}
          </ol>
        </section>

        <div className="profile-counters">
          <div className="profile-visitors" role="img" aria-label={`${visitors} visitors`}>
            <span className="profile-label" aria-hidden="true">visitors</span>
            <span className="profile-visitors-digits font-pixel" aria-hidden="true">
              {digits.split("").map((digit, index) => (
                <i key={index}>{digit}</i>
              ))}
            </span>
          </div>
          <button type="button" className="profile-song" aria-disabled="true" title="profile songs arrive soon">
            <span aria-hidden="true">♪</span> no song yet
          </button>
        </div>
      </div>

      {side && <div className="space-header-side">{side}</div>}
    </div>
  );
}
