import { lastSpaceSlug, normalSpaceHash } from "../lib/routes";

/**
 * Placeholder About page. The upstream marketing page (vendor tours for the
 * removed services) was cut in the strip phase; the Afterspace page arrives
 * with the rebrand (docs/plan/05-design).
 */
export function About() {
  return (
    <main className="paper-bg" style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: "2rem" }}>
      <section style={{ maxWidth: 520 }}>
        <h1>afterspace</h1>
        <p>a live, shared page for a friend group. built on a disclosed fork of OurSpaces (MIT).</p>
        <p>
          <a href={normalSpaceHash(lastSpaceSlug())}>back to the space</a>
        </p>
      </section>
    </main>
  );
}

export default About;
