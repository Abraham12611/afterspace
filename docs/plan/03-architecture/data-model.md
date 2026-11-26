# Data model

Upstream schema: `convex/schema.ts` composes `convex/tables/{rooms,mail,voice,rightOfWay,games}.ts` plus Convex
Auth tables.

## Kept
`users`, `spaces`, `members`, `widgets`, `messages`, `votes`, `paintMarks`, `presence`, `baselines`,
`deals`, `links`, `briefs`, `aiWrites`, `leases`, `pending`, `choiceVotes`, `games`, `gamePlayers`,
`gameRounds`, `gameAnswers`, `awards`, `puzzlePieces`, `work`, `recaps`.

## Changed
| Table | Change |
|---|---|
| `spaces` | Drop `inboxId`, `inboxAddress`, `askThreadId`, `ragIndexedAt`. Add `mood?: string`, `skin: "coven"\|"crypt"\|"seance"\|"hollow"`, `songUrl?`, `songTitle?` |
| `members` | Add `awayMessage?: string`, `awaySince?: number`, `lastVisitAt?: number` |
| `widgets` | Drop `embedding`, `embeddedText`, vector index `by_embedding` |

## Removed
`emailEvents`, `linkRefreshQueue`, `askStreams` (unless séance streams), `waitlist` (unless used on welcome).

## Added (`convex/tables/after.ts`)
| Table | Fields | Indexes |
|---|---|---|
| `familiars` | spaceId, name, generation (1, 2...), health, state, bornAt, diedAt?, lastTickAt | by_space |
| `graveyard` | spaceId, kind ("pet"\|"plan"), name, epitaph, born, died, cause, widgetId? | by_space |
| `letters` | spaceId, from (memberId), to (memberId[] or "all"), text, photoId?, openAt?, openedBy: memberId[], widgetId | by_space, by_space_to |
| `receipts` | spaceId, uploadedBy, storageId, read? {merchant,total,currency,date}, status ("reading"\|"read"\|"failed"\|"confirmed"), widgetId? | by_space |
| `visits` | spaceId, memberId, at | by_space, by_space_member |
| `modelCalls` | job, model, ms, inTok, outTok, usd, at | by_at |
| `spiritLocks` | widgetId, answer, lockedAt, hands: memberId[] | by_widget |

## Activity feeding the pet and Top 8
Upstream `convex/activity.ts` already records activity. Make sure these events are recorded with
`{spaceId, memberId, kind, widgetId?, with?: memberId[], at}`: card added, vote, rsvp, claim, split line,
check-in, letter sent, letter opened, spirit board hand, thread reply, visit.
