import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ageLabel } from "../lib/familiar";
import { normalSpaceHash } from "../lib/routes";
import "../styles/graveyard.css";

/** The graveyard (F4): dead pets and plans that died, newest first, each with its epitaph. `#/space/<slug>/graveyard` */

const dateOf = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();

export function Graveyard({ slug }: { slug: string }) {
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {
    /* keep the raw slug */
  }
  const space = useQuery(api.spaces.getBySlug, { slug: name });
  const rows = useQuery(api.familiar.graveyardFor, space ? { spaceId: space._id } : "skip");
  useEffect(() => {
    document.title = `graveyard · ${space?.name ?? name}`;
  }, [space?.name, name]);

  return (
    <main className="graveyard-page">
      <header className="graveyard-head">
        <a className="graveyard-back" href={normalSpaceHash(name)}>
          back to {space?.name?.toLowerCase() ?? "the page"}
        </a>
        <h1>the graveyard</h1>
        <p>what this space let die, and what it said about it.</p>
      </header>
      {rows === undefined || space === undefined ? (
        <p className="graveyard-empty">digging…</p>
      ) : rows.length === 0 ? (
        <p className="graveyard-empty">nothing buried yet. keep it that way.</p>
      ) : (
        <ul className="graveyard-list">
          {rows.map((r) => (
            <li key={r._id} className={`tomb is-${r.kind}`}>
              <div className="tomb-stone" aria-hidden="true">
                <span>{r.kind === "pet" ? "†" : "✝"}</span>
              </div>
              <div className="tomb-text">
                <h2>
                  {r.name}
                  <span className="tomb-kind"> · {r.kind === "pet" ? "pet" : "plan"}</span>
                </h2>
                <p className="tomb-epitaph">“{r.epitaph}”</p>
                <p className="tomb-meta">
                  {dateOf(r.born)} – {dateOf(r.died)} · lived {ageLabel(r.born, r.died)} · {r.cause}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
