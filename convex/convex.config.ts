import { defineApp } from "convex/server";
import { v } from "convex/values";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import presence from "@convex-dev/presence/convex.config";
import authWellKnown from "./components/authWellKnown/convex.config";

// Our own HTTP endpoints (convex/http.ts) are served under /api so the
// static site can own the root.
const app = defineApp({
  httpPrefix: "/api",
  env: {
    // OpenRouter, every model call (convex/openrouter.ts). Unset = no model: AI features return canned output.
    OPENROUTER_API_KEY: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
    // Google sign-in (docs/accounts.md). Unset = the button never shows.
    AUTH_GOOGLE_ID: v.optional(v.string()),
    AUTH_GOOGLE_SECRET: v.optional(v.string()),
    // The only door to the back room (#/admin, convex/admin.ts). Unset =
    // every admin function refuses, so a fresh clone has no reset button.
    ADMIN_KEY: v.optional(v.string()),
    // Convex Auth signing keys — see convex/auth.ts + auth.config.ts.
    JWT_PRIVATE_KEY: v.optional(v.string()),
    JWKS: v.optional(v.string()),
  },
});

app.use(staticHosting, { httpPrefix: "/" });

// Data/infra: backfills, tallies, live counters, quotas, resilient externals.
app.use(migrations);
// Two named instances: poll vote tallies (namespaced by widget) and
// per-space member counts — separate data structures, same component.
app.use(aggregate, { name: "pollTallies" });
app.use(aggregate, { name: "memberCounts" });
app.use(shardedCounter);
app.use(rateLimiter);
app.use(actionRetrier);

// Orchestration: bounded fan-out, durable multi-step flows.
app.use(workpool);
app.use(workflow);

// Realtime.
app.use(presence);

// Auth is @convex-dev/auth (convex/auth.ts) — a library, not a component, so
// there is nothing to app.use for it; it adds tables via ...authTables. This
// component only publishes the OIDC discovery documents Convex fetches to
// validate those tokens, at the root where it looks for them.
app.use(authWellKnown, {
  httpPrefix: "/.well-known",
  env: { JWKS: app.env.JWKS },
});

export default app;
