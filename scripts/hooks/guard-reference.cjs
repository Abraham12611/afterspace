// PreToolUse: block writes/deletes inside reference/ourspaces-app (the read-only upstream copy). Exit 2 blocks.
const { readStdin, pathsIn } = require("./lib.cjs");
readStdin().then((raw) => {
  const hit = pathsIn(raw).find((p) => /(^|[\\/])reference[\\/]+ourspaces-app([\\/]|$)/i.test(p));
  if (hit) {
    console.error(`Blocked: ${hit} is inside reference/ourspaces-app, the read-only upstream copy. Edit the Afterspace source at the repo root instead.`);
    process.exit(2);
  }
});
