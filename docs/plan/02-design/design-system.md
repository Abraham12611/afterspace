# Design system

Upstream tokens live in a Tailwind v4 `@theme` block in `src/index.css` and per-feature CSS files.
We swap values, not structure, so most components restyle for free. New tokens are added in the same block.

## Color
| Token | Upstream | Afterspace | Use |
|---|---|---|---|
| `--color-paper` | `#211922` | `#1b1220` night plum | Page background |
| `--color-paper-deep` | | `#120b16` | Behind the board, header |
| `--color-card` | `#fffaf7` | `#f3ead9` bone | Card paper |
| `--color-ink` | | `#1d141f` | Text on cards |
| `--color-muted` | | `#7a6a78` | Labels |
| `--color-lime` | `#c9ff3d` | replaced by `--color-slime` `#9dff4f` | Live/online, primary action |
| new `--color-pumpkin` | | `#ff7a1a` | Votes, highlights, CTA hover |
| new `--color-candle` | | `#ffd36b` | Holds (halo), séance |
| new `--color-blood` | | `#c2263a` | Errors only |
| new `--color-ghost` | | `#e9f5ff` | Pet, glows |
Space accents (`crew`, `couple`, ...) are replaced by the four skins in F9:
coven (pumpkin), crypt (slime), séance (candle), hollow (moth purple `#9c7bff`).

Contrast: ink on bone and bone on plum are both above 7:1. Pumpkin text only at 18 px bold or larger.

## Type
| Role | Upstream | Afterspace |
|---|---|---|
| Display (titles, big numbers) | Bricolage Grotesque 700/800 | **Unbounded** 700/800 (wide, chunky, y2k) |
| Body | IBM Plex Sans | **Figtree** 400/600 |
| Handwritten (captions, notes) | none | **Caveat** 500 |
| Pixel (visitor counter, buddy list, player) | none | **VT323** |
All from Google Fonts; swap the import on line 1 of `src/index.css` and `--font-*` tokens.
Keep lowercase titles.

## Shape
| Element | Upstream | Afterspace |
|---|---|---|
| Card | radius 26, thick black outline, hard offset shadow | radius 14, 1.5 px `ink/20%` edge, soft drop shadow + faint warm glow, paper grain texture |
| Card attachment | tape | push-pin replaced by a small **candle** or **bone pin**; tape kept for photos |
| Pill / button | radius 9999, black | radius 9999, plum with 1 px bone edge; primary = slime fill, ink text |
| Tilt | ±1-2° on many cards | ±0.5-1.5°, never on cards with inputs while focused |
| Per-type silhouettes | none | countdown = tombstone arch top; rsvp = ticket notches; split = receipt zigzag; note = torn edge; letter = envelope with wax seal |
| Linked cards | flow marks | **red string** between pins (SVG path with slight sag) |

## Board surface
Night plum with a subtle cork/grain noise, soft vignette, and faint fog drifting slowly
(CSS animated gradient, disabled under `prefers-reduced-motion`).

## Components to restyle (by upstream file)
`WidgetCard.tsx` (frame + silhouettes), `ActionDock.tsx`, `Rail.tsx`, `VoiceOrb.tsx`, `JoinForm.tsx`,
`LookRow.tsx`, `MemberFace.tsx`, `PeerCursor.tsx`/`OwnCursor.tsx` (cursor = small planchette with name tag),
`RightOfWay.tsx` + `right-of-way.css` (halo becomes candle glow), `SettingsSheet.tsx`, `WidgetPicker.tsx`,
`MailArrival.tsx` (envelope + wax seal), `RoomKnows.tsx`, `SpaceLiveStrip.tsx`.
