# Art provenance

All brand art in `public/brand`, `public/icons`, `public/mascots`, `public/ui`, `public/avatars` and the favicon was
generated for Afterspace on Nov 26, 2026 with fal.ai, then cut by `scripts/slice-art.mjs`. None of it comes from upstream OurSpaces.

| Source file (`design/source-art/`) | Model (fal endpoint) | Becomes |
|---|---|---|
| `logo-mark.svg` | `fal-ai/recraft/v4.1/pro/text-to-vector` | `public/brand/logo-mark.svg`, `logo-mark-512.png` |
| `app-icon.svg` | `fal-ai/recraft/v4.1/text-to-vector` | `public/favicon.png`, `public/icons/*`, `public/apple-touch-icon.png` |
| `wordmark.png` | `openai/gpt-image-2.6/sunburst/text-to-image` | `public/brand/wordmark*.png`, `og.png` |
| `wisp-states.png` | `openai/gpt-image-2.6/sunburst/text-to-image` | `public/mascots/wisp-{thriving,okay,hungry,fading,dead}.png` |
| `mascots.png` | `openai/gpt-image-2.6/sunburst/text-to-image` | `public/mascots/{pip,bones,planchette}.png` |
| `avatars-grid.png` | `openai/gpt-image-2.6/sunburst/text-to-image` | `public/avatars/look-01..12.png` |
| `ui-kit.png` | `openai/gpt-image-2.6/sunburst/text-to-image` | `public/ui/*.png` |
| `cards-concept.png` | `google/nano-banana-2.1` | Reference only (card silhouette direction), not shipped |

Re-cut after changing a source: `node scripts/slice-art.mjs`.
