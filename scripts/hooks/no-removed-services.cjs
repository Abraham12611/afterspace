// PostFileSave: warn when a saved source file mentions a service Afterspace removed.
const fs = require("node:fs");
const { readStdin, pathsIn } = require("./lib.cjs");
const REMOVED = /agentmail|nebius|nemotron|tavily|firecrawl/i;
const SKIP = /(^|[\\/])(reference|node_modules|docs[\\/]plan|\.kiro)([\\/]|$)/i;
readStdin().then((raw) => {
  for (const p of pathsIn(raw)) {
    if (SKIP.test(p) || !fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(REMOVED);
    if (m) console.log(`Removed service "${m[0]}" referenced in ${p}. Afterspace removed it (.kiro/steering/tech.md): delete or stub this reference, don't reintroduce it.`);
  }
});
