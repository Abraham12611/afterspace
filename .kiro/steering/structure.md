# Structure

The repo keeps the fork's layout so diffs stay readable. New code goes in the places below.

```
/                      submission repo root
  .kiro/               specs, steering, hooks (must be committed)
  docs/plan/           the Afterspace plan (start at docs/plan/README.md)
  convex/              backend
    tables/            table definitions, one file per area (rooms, voice, rightOfWay, games, + new: after.ts)
    openrouter.ts      the only file that calls a model
    ai.ts              model map per job
    familiar.ts        NEW: pet state, scheduled decay, revive
    top8.ts            NEW: Top 8 query
    letters.ts         NEW: sealed letters, delivery schedule
    receipts.ts        NEW: receipt photo -> split
    spiritBoard.ts     NEW: shared planchette lock
  src/
    lib/               pure logic; new: familiar.ts, top8.ts, spiritBoard.ts, receipt.ts (+ .test.ts)
    components/        app chrome and board pieces; new: BuddyList, ProfileHeader, FamiliarPet, Graveyard, LetterComposer, SeanceSheet
    widgets/           card renderers; new: spiritBoard.tsx, y2kPlayer.tsx, guestbook.tsx
    pages/             routes
    data/              static data (spaces, avatars, themes)
  public/              our own assets only (avatars, mascots, sounds, icons)
```

## Naming
- One concept, one word: "space" (not room/board), "card" (the code may still say widget), "hold" in UI copy.
- New card types: `spiritBoard`, `guestbook`, `y2kPlayer`, `familiar`.
