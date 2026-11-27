---
inclusion: fileMatch
fileMatchPattern: ['src/**/*.css', 'src/components/**', 'src/widgets/**', 'src/pages/**', 'src/styles/**']
---
# Design system (applies to any UI file)

Full spec: `docs/plan/02-design/design-system.md`, `brand.md`, `layout-changes.md`, `motion-and-sound.md`.

- Tokens only. Never hard-code a color: use `--color-paper` (night plum `#1b1220`), `--color-paper-deep`,
  `--color-card` (bone `#f3ead9`), `--color-ink`, `--color-muted` (`#6b5b69`, AA on bone), `--color-slime`,
  `--color-pumpkin`, `--color-candle`, `--color-blood` (errors only), `--color-ghost`.
- Fonts: `--font-display` Unbounded (titles, big numbers), `--font-sans` Figtree (body), Caveat (handwritten
  captions), VT323 (pixel: counters, buddy list, player). Titles stay lowercase.
- Cards: radius ~14, soft shadow + faint warm glow, paper grain. No thick black outlines or hard offset shadows
  (that was the upstream look). Per-type silhouettes live in `src/styles/cards.css`.
- Decorative art comes from `public/{mascots,ui,brand}`. Text-bearing controls are real HTML, never PNGs.
- Copy: lowercase, warm, a little spooky. Use the brand.md copy table. No third-party trademarks in UI.
- Every animation respects `prefers-reduced-motion`. Sounds are off until the user enables them.
- Must work at 375 px. Focus rings visible. WCAG AA contrast.
