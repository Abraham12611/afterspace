# Provenance

## What we forked
- Repo: https://github.com/thomasnguyen/ourspaces-app
- License: MIT, Copyright (c) 2026 Thomas Nguyen
- Commit: `45bebcbeb7474e3e30f403b2f8e466e7bdc07304` (Oct 13, 2026), before the Kiroween submission period
  (Oct 30 - Dec 4, 2026).

## What the rules say (paraphrased from kiroween.devpost.com/rules)
- Projects must be newly created during the submission period. Frameworks, libraries and starter templates
  are fine, but any other pre-existing code must be disclosed.
- Open-source code is allowed if you follow its license and your submission builds on and enhances it.
- Only the work done during the submission period is what's being judged.

## What that means for us
1. **Disclose it.** README "Built on" section, Devpost description, and the Kiro write-up all say Afterspace
   starts from a fork of OurSpaces, and link it.
2. **Keep the license.** `LICENSE` keeps the upstream copyright line; we add ours below it.
3. **Make the diff provable.** Commit 1 is the untouched import, tagged `upstream-import`. Everything after is
   ours, so `git diff upstream-import..main` is our submission-period work.
4. **Make the delta large.** Judges score Innovation on how the project differs from existing concepts.
   The new features (features-new.md), the rebrand and the AI-provider swap must be visible in the first
   30 seconds of the demo.
5. **Remove their personal data.** Upstream seed data and photos include real people. All of it is replaced.

## Why not hide it
The upstream repo, live site and demo video are public, it won a hackathon in October, and its pitch
also opens with "Remember MySpace?". An undisclosed fork is likely to be recognized, and a
disqualification loses every prize, bonus prizes included. Disclosure costs some Innovation points and
nothing else.

## README "Built on" text (draft)
> Afterspace began as a fork of [OurSpaces](https://github.com/thomasnguyen/ourspaces-app) by Thomas Nguyen
> and Holly Tran (MIT). We kept its live board, presence and Right of Way gate; removed AgentMail, Nemotron,
> Tavily and Firecrawl; moved all AI to OpenRouter; rebuilt the look; and added the buddy list, Top 8,
> pet, spirit board, sealed letters, receipt splitting and séance. Everything after the `upstream-import`
> tag was built during Kiroween 2026.
