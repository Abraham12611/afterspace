# Afterspace plan

Read in order. Every file is short and does one job.

| # | Folder | File | What it answers |
|---|---|---|---|
| 0 | `00-overview/` | `vision.md` | What Afterspace is, who it's for, the pitch |
| 0 | | `provenance.md` | What we forked, what we must disclose, how |
| 0 | | `contest-strategy.md` | Category, prizes, how each judging criterion is won |
| 0 | | `decisions.md` | Decisions made and still open |
| 1 | `01-product/` | `features-inherited.md` | Every upstream feature: keep, reskin, or cut |
| 1 | | `features-new.md` | The Frankenstein features, with behavior and acceptance checks |
| 1 | | `sitemap.md` | Pages, sub-pages, modals, popovers, cards and how they connect |
| 1 | | `cards.md` | The card catalog after the fork |
| 1 | | `user-flows.md` | The flows the demo must show end to end |
| 2 | `02-design/` | `brand.md` | Name, voice, mascots, trademark-safe names |
| 2 | | `design-system.md` | Tokens, type, shapes, card frames |
| 2 | | `layout-changes.md` | What moves where, screen by screen |
| 2 | | `motion-and-sound.md` | Animations and sounds |
| 3 | `03-architecture/` | `architecture.md` | System overview after the fork |
| 3 | | `strip-plan.md` | Exactly how AgentMail, Nebius, Tavily, Firecrawl, RAG and the labs come out |
| 3 | | `openrouter.md` | The AI layer on OpenRouter |
| 3 | | `data-model.md` | Tables kept, cut and added |
| 3 | | `env-and-deploy.md` | Env vars, deploy, demo reset |
| 3 | | `security.md` | Trust boundaries and limits |
| 4 | `04-build/` | `phases.md` | Phases, sub-phases, checkboxes, day plan (the progress tracker) |
| 4 | | `file-manifest.md` | Every file to delete, modify or create, by phase |
| 4 | | `testing.md` | Unit, property-based and manual checks |
| 4 | | `kiro-usage.md` | How we use specs, steering, hooks, MCP, powers (scored) |
| 5 | `05-submission/` | `checklist.md` | Everything Devpost needs |
| 5 | | `demo-script.md` | The 3-minute video, shot by shot |
| 5 | | `writeups.md` | Outlines for the Kiro write-up, blog post and social post |

Steering lives in `.kiro/steering/`. Per-phase specs go in `.kiro/specs/<phase>/` when that phase starts.
