# Write-up outlines

## Devpost description
1. Inspiration: the profile page we lost; group chats bury everything.
2. What it does: the live page, the ask, Right of Way, and the stitched-in old web (buddy list, Top 8, pet,
   spirit board, letters, receipts, séance).
3. How we built it: Convex + OpenRouter + React; built on a disclosed fork of OurSpaces (link); what we removed,
   rewrote, and added (numbers from `git diff --shortstat upstream-import..main`).
4. Challenges: stripping four integrations without breaking the live board; making the pet fair.
5. What's next: real groups, mobile app install, more pets.

## Kiro write-up (judges read this for Technological Implementation)
Answer each prompt from the contest page with evidence from `docs/kiro-log.md`:
- Which Kiro apps (IDE / CLI / Web) and how they differed.
- Custom agent: `strip-surgeon`, what it did.
- Hooks: the table from kiro-usage.md, plus counts and one story of a hook catching a mistake.
- Specs: how phases were structured; spec vs vibe comparison.
- Steering: which file changed results most (likely fileMatch `design.md`).
- MCP: Firecrawl, Context7, fal, Exa, and what each unblocked.
- PBT: which properties, and one bug it found.
- Powers: what was tried.

## Blog post (Bonus Blog Prize)
Title idea: "We brought the old profile page back from the dead with Kiro." Mention it's for Kiroween 2026.
Sections: why, the fork and what we changed, the pet math, the AI that waits its turn, what Kiro did well and badly.

## Social post (Social Blitz)
Must start with `#KiroweenHackathon26`. One favorite Kiro thing + how it changed our process + a 10 s clip.
