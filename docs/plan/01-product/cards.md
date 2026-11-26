# Card catalog after the fork

"Card" is the UI word; the code type is `WidgetType` in `src/data/types.ts`.
Voice = the AI can create it from an ask (it's in `src/lib/deck/catalog.ts`).

## Kept (reskinned)
| Type | Shows as | Voice | New look |
|---|---|---|---|
| `poll` | poll | yes | Bone paper, votes as candle flames |
| `rsvp` | who's coming | yes | Ticket stub with a notch |
| `countdown` | countdown | yes | Tombstone top, big number |
| `potluck` | checklist / who's bringing | yes | Lined index card |
| `note` | note | yes | Torn paper, handwritten font |
| `expenseSplit` | split | yes + receipt photo | Receipt paper with a zigzag bottom |
| `itinerary` | plan | yes | Folded map |
| `availability` | when's good | yes | Calendar page |
| `decision` | decision | yes | Coin flip |
| `wheel` | spin the wheel | yes | Spinning planchette wheel |
| `messageWall` | messages | yes | |
| `quote` | quote | yes | |
| `jokeRegistry` | inside jokes | yes | |
| `dualClock` | two clocks | yes | Pocket watches |
| `checkIn` / `standings` | challenge | yes (recipe) | |
| `photoWall` | memories | no | Polaroids with tape |
| `frame` | section | no | Red-string frame |
| `sticker` | sticker | no | Our mascots |
| `cozyColor` | paint together | no | |
| `game` / `scoreboard` | games | no | Jigsaw + hot seat only |
| `letter` | sealed letter | no | Wax-sealed envelope (F6) |
| `keepsake` | pinned takeaway | no | |
| `chat` | chat | no | |
| `dailyQ` | question of the day | no | |

## New
| Type | Shows as | Voice | Feature |
|---|---|---|---|
| `spiritBoard` | spirit board | yes | F5 |
| `guestbook` | guestbook | no (one per space, auto) | F2 |
| `y2kPlayer` | profile song | no (one per space) | F3, replaces `playlist` |
| `familiar` | the pet | no (one per space, auto) | F4 |

## Cut
`linkCard`, `linkShelf`, `linkPile`, `hotLinks`, `shipPost`, `roundtable` (Firecrawl/build room),
`backendLive` (upstream stats show-off), `media`, `weather`, `sports` (re-add only if they need no key),
`playlist` (replaced by `y2kPlayer`).

## Picker categories
1. plan: poll, rsvp, when's good, plan, countdown, checklist, decision, spin the wheel, spirit board
2. money: split
3. together: messages, inside jokes, quote, paint together, games, challenge, two clocks
4. keep: memories, note, sealed letter, pinned takeaway, section, sticker
