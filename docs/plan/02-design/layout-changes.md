# Layout changes (what moves where)

The goal: someone who saw OurSpaces should not recognize the screen at a glance.

## Space page
| Element | Upstream position | Afterspace position |
|---|---|---|
| Space list | Left vertical rail of photo tiles | Top-left **tab strip** of small pet icons (each space's pet), under the header; on phone, a swipe row |
| Space title + subtitle | Top-left over the board | Inside the new **profile header** band at the top, with banner, mood line, Top 8, visitors, ♪ |
| "1 here now · add · invite" | Top-right pill | Replaced by the **buddy list window** (bottom-right, draggable, minimizable) + invite in header |
| Voice orb + "say what to add" | Bottom center dock | Bottom center **crystal ball** bar; the ball glows while listening |
| Live sync badge | Bottom-left | Removed; the buddy list shows connection state |
| Demo banner | Top black bar | Thin plum ribbon: "this is the demo page · make your own" |
| Pet | none | Floats over the board, drifts near recent activity; tap for popover |
| Guestbook | none | Pinned card just below the header |
| Mascot sticker (blue cat) | On the board | Removed; wisp/pip/bones stickers instead |

## "What this space knows" → the grimoire
| Upstream | Afterspace |
|---|---|
| Cream page, title top-left, avatars top-right, 3 columns of cards | Dark page styled as an open book: two facing pages; left page "who we are" (avatars, Top 8 links) and "how we do things"; right page "where things stand" and "coming up" |
| Input "tell it something" under the title | Input at the bottom like writing on the page, with a quill icon |
| Cross out fact | Strike-through in ink, kept |

## Join modal
| Upstream | Afterspace |
|---|---|
| Dark rounded card, lime CTA, avatar grid 4×2 | An old guestbook page on bone paper: "sign in to the page" in handwriting, name line, looks as a 6×2 sticker sheet, slime "step inside →" |

## Welcome page
New layout: full-bleed fog, a big `afterspace` wordmark, one line, two buttons, and a live preview of the demo
space's header (Top 8 + pet) underneath.

## Phone (375 px)
- Header collapses to: name, pet, buddy count. Tap expands Top 8 + visitors.
- Buddy list becomes a bottom sheet.
- Crystal ball bar stays bottom; card picker is a bottom sheet.
