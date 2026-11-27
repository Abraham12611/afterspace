import { MAKE_SPACE_EVENT } from "../components/DemoBanner";
import { ProfileHeader, type ProfileFace } from "../components/ProfileHeader";
import { COVEN } from "../data/spaces";
import { getBuildClubVisitorCount } from "../lib/onboarding";
import { normalSpaceHash, DEFAULT_SPACE_SLUG } from "../lib/routes";
import { playSound } from "../lib/sounds";

/**
 * Welcome (P2.6, docs/plan/02-design/layout-changes.md): fog, the big wordmark,
 * one line, two buttons, the wisp floating, and a still preview of the demo
 * space's header (Top 8 + pet) underneath. Reached at `#/welcome` (and `#/test`).
 */
const PREVIEW_TOP8: ProfileFace[] = COVEN.members.slice(0, 8).map((member) => ({
  key: member.name,
  name: member.name,
  color: member.color,
}));

function openDemo() {
  playSound("place");
  window.location.hash = normalSpaceHash(DEFAULT_SPACE_SLUG);
}

/* "make your own" opens the space maker, which lives on the space page (LiveSpace listens). */
function makeYourOwn() {
  playSound("tap");
  window.location.hash = normalSpaceHash(DEFAULT_SPACE_SLUG);
  window.setTimeout(() => window.dispatchEvent(new Event(MAKE_SPACE_EVENT)), 700);
}

export function Welcome() {
  return (
    <main className="welcome-page as-welcome paper-bg">
      <div className="as-welcome-fog" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <section className="as-welcome-hero" aria-labelledby="welcome-heading">
        <img className="as-welcome-wisp" src="/mascots/wisp-thriving.png" alt="" width={160} height={160} />
        <h1 id="welcome-heading" className="as-welcome-wordmark">
          <img src="/brand/wordmark.png" alt="afterspace" width={2201} height={468} fetchPriority="high" />
        </h1>
        <p className="as-welcome-line">your friends&apos; page, back from the dead.</p>
        <div className="as-welcome-actions">
          <button type="button" className="as-btn as-btn-primary" onClick={openDemo}>
            open the demo page <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="as-btn as-btn-secondary" onClick={makeYourOwn}>
            make your own
          </button>
        </div>
      </section>

      <div className="as-welcome-preview" aria-hidden="true" inert>
        <ProfileHeader
          name={COVEN.name}
          kind={COVEN.kind}
          tagline={COVEN.tagline}
          top8={PREVIEW_TOP8}
          visitors={getBuildClubVisitorCount()}
        />
      </div>
    </main>
  );
}

export default Welcome;
