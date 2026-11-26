# Provenance rule

Afterspace is built on a fork of `thomasnguyen/ourspaces-app` (MIT, Copyright (c) 2026 Thomas Nguyen),
imported at upstream commit `45bebcbeb7474e3e30f403b2f8e466e7bdc07304` (Oct 13, 2026).

The Kiroween rules allow open-source code only if we comply with its license, disclose pre-existing code,
and build new work on top of it. So:

- Never remove or edit the upstream copyright line in `LICENSE`. Our own line is added below it.
- The first commit of this repo is the unmodified import. Every later commit is our work, so the
  diff from that commit is exactly what we built during the submission period.
- Keep `docs/plan/00-overview/provenance.md` and the README "Built on" section accurate. When a phase
  removes or rewrites an upstream module, update `docs/plan/04-build/file-manifest.md`.
- Never commit upstream personal data (real names, photos, emails from their seed or `public/photos`).
  Replace it with our own fictional demo data.
- `reference/` stays gitignored. It is a read-only copy for comparison, not part of the build.
