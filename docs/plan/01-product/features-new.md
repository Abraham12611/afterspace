# New features (the Frankenstein parts)

Each feature: what it is, the rules, where it lives, and how we know it works.
Priority: **P0** must ship, **P1** should ship, **P2** cut first.

---

## F1. Buddy list + away messages + door creak (P0)
**What.** A small floating window, like an old IM buddy list, listing members: online (here now), away
(with their away message), offline. Joining or leaving plays a door sound for others.

**Rules**
- Online = presence heartbeat within 30 s. Away = online but tab hidden for 2 min, or a manual away message.
- Away message: max 80 characters, shown on the avatar and in the list. Cleared on "i'm back".
- Sounds are off until the user turns sound on once (stored locally).

**Where.** `src/components/BuddyList.tsx`, `convex/presence.ts` (+ `awayMessage` on `members`).

**Done when**
- Two tabs: B closes, A sees B go offline within 30 s and hears the door (sound on).
- Setting an away message shows on the other tab within 1 s.

---

## F2. Profile header: Top 8, visitor counter, guestbook (P0)
**What.** The top of every space looks like an old profile page: banner, space name, mood line, the
space's Top 8 for the viewer, a pixel visitor counter, and a "sign the guestbook" button.

**Rules**
- Top 8 = the 8 members the viewer interacted with most in the last 7 days. Interaction weights: voted on
  the same poll 1, both RSVP'd yes 2, split an expense 2, replied in the same thread 1, sent a letter 3.
  Ties break by most recent interaction, then name. Viewer is never in their own Top 8. Fewer than 8
  members: show all.
- Visitor counter = distinct members who ever opened the space, plus total visits; pixel digits.
- Guestbook = a card type `guestbook` (reskinned message wall) pinned under the header.

**Where.** `src/lib/top8.ts` (pure), `convex/top8.ts`, `src/components/ProfileHeader.tsx`, `src/widgets/guestbook.tsx`.

**Done when**
- Property tests: output length = min(8, members-1), never contains viewer, deterministic.
- Voting on a poll with B moves B up in A's Top 8 live.

---

## F3. Profile song: y2k player (P1)
**What.** The radio card becomes a small retro media player with a play button, track name, and an
EQ animation. The space picks one "profile song" (a link or one of our bundled royalty-free tracks).

**Rules**
- Never autoplays. Tap to play. Each person controls their own playback.
- Bundled tracks must be royalty-free with a license file in `public/music/LICENSE.md`.

**Where.** Rework `radio` card into `src/widgets/y2kPlayer.tsx`; song setting on `spaces`.

**Done when** the track plays on tap on desktop and phone, and the song choice syncs to all members.

---

## F4. The pet (familiar) + graveyard (P0)
**What.** Each space has a small ghost pet that floats on the page. Its health comes from what the group
actually does. Neglect it and it fades, then dies and goes to the graveyard. The group can revive it.

**Rules**
- `health(events, now)` is pure. Inputs: cards added, votes, RSVPs, claims, letters, check-ins, and
  distinct members present, each in a 72 h window with linear decay. Output 0-100, clamped.
- States: thriving (70-100), okay (40-69), hungry (15-39), fading (1-14), dead (0 for 24 h).
- "Feed" is not a button that adds health. Health only rises from real activity. The pet shows a hint of
  what would help ("nobody's voted on dinner yet").
- Death: a scheduled job checks every 30 min. On death, write a graveyard entry with an epitaph (LLM, with
  canned fallback), name, age, cause ("nobody came back after the cabin trip").
- Revive: when a dead pet exists, 3 distinct members must each do something within 24 h. Then a new pet
  hatches with the old pet's name + " ii".
- Pets have a name chosen at space creation; renameable in settings.

**Where.** `src/lib/familiar.ts` (pure + tests), `convex/familiar.ts`, `src/components/FamiliarPet.tsx`,
`src/pages/Graveyard.tsx`.

**Done when**
- Property tests: always 0-100; adding an event never lowers health; with no new events, health never rises
  as time advances.
- Demo seed can fast-forward a space to "fading" and to "dead".

---

## F5. Spirit board (P0)
**What.** A decision card. A question, 2-6 answers around a board, and a planchette. Members grab the
planchette together; it moves to the average of everyone's pointer. When it rests on one answer for 3
seconds with 2+ hands on it, that answer locks.

**Rules**
- Holding the planchette is a hold (Right of Way); the AI can't change a board while anyone's hand is on it.
- Planchette position = mean of current holders' pointers, sent through presence at the existing 50 ms rate.
- Lock is decided on the server from presence timestamps, not the client.
- One person alone can move it but can't lock it.

**Where.** `src/lib/spiritBoard.ts` (pure: mean, dwell detection + tests), `convex/spiritBoard.ts`,
`src/widgets/spiritBoard.tsx`.

**Done when** two tabs move one planchette together, and a single tab cannot lock an answer.

---

## F6. Sealed letters / time capsule (P1)
**What.** Write a letter to one member or the whole space. It lands as a sealed envelope (reusing the
mail-arrival animation). Optionally set an "open on" date: until then the envelope is locked.

**Rules**
- Max 2,000 characters, optional one photo.
- Only the addressee(s) can open. Opening is shown to the sender ("read").
- A scheduled function unlocks dated letters at their time.

**Where.** `convex/letters.ts`, `src/components/LetterComposer.tsx`, rework `letter` card and `MailArrival.tsx`.

**Done when** A writes to B with "open in 1 minute"; B sees it locked, then unlocked, then opens it.

---

## F7. Receipt photo to split (P1)
**What.** Snap or upload a receipt. A vision model on OpenRouter reads the total, merchant and date. It
proposes a split card; the payer confirms before it's added.

**Rules**
- Accept jpg/png/webp up to 5 MB. Resize client-side to max 1600 px.
- The model returns JSON `{merchant, total, currency, date}`. Code validates: total > 0, currency is a
  3-letter code. Anything invalid falls back to manual entry.
- Split is equal among "who's in" (picked by the payer, default everyone not away).
- The payer must confirm. The model never writes a split on its own.

**Where.** `src/lib/receipt.ts` (pure parsing + split math + tests), `convex/receipts.ts`,
`src/components/ReceiptCapture.tsx`; reuse `expenseSplit` card.

**Done when** the bundled sample receipt image produces the right total, and split shares sum exactly to the
total (property test on rounding: shares differ by at most 1 cent and sum to the total).

---

## F8. Séance: summon what you missed (P1)
**What.** When you come back after 24 h+, a candle sheet offers "summon what you missed". It produces up to
6 lines, each linked to its card.

**Rules**
- Built from the upstream recap logic, model moved to OpenRouter, canned fallback.
- Each line cites a card id; tapping a line flies the board to that card.

**Where.** Rework `convex/recap.ts`; `src/components/SeanceSheet.tsx`.

**Done when** a member away for 24 h sees the prompt, and every line opens the right card.

---

## F9. Space skins (P2)
**What.** Like customizing a profile page: each space picks a skin (background, accent color, cursor trail,
optional glitter). Four presets, no free-form CSS.

**Where.** `src/data/spaceThemes.ts` (rework), settings sheet.

**Done when** changing the skin updates every member's screen live.

---

## Cut order if late
F9, then F3, then F8, then F6. F1, F2, F4, F5 are the demo and are never cut. F7 is the "impact" story;
cut it only after F6.
