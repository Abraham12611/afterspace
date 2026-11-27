// Stop: LICENSE must keep the upstream MIT copyright line (disclosed-fork compliance). Exit 1 keeps the agent working.
const fs = require("node:fs");
const t = fs.existsSync("LICENSE") ? fs.readFileSync("LICENSE", "utf8") : "";
if (!/Copyright \(c\) 2026 Thomas Nguyen/.test(t)) {
  console.error('LICENSE no longer carries the upstream MIT line "Copyright (c) 2026 Thomas Nguyen". Restore it (provenance rule) before finishing.');
  process.exit(1);
}
