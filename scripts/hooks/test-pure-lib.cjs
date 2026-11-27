// PostFileSave on src/lib/**/*.ts: run the related Vitest + fast-check tests and report the result.
const { spawnSync } = require("node:child_process");
const { readStdin, pathsIn } = require("./lib.cjs");
readStdin().then((raw) => {
  const files = pathsIn(raw).filter((p) => /src[\\/]lib[\\/].*\.ts$/.test(p));
  if (!files.length) return;
  const r = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "related", "--run", ...files], { encoding: "utf8" });
  const lines = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "").split("\n");
  const keep = lines.filter((l) => /Test Files|Tests |FAIL|Counterexample|AssertionError|Error:/.test(l)).slice(0, 15);
  console.log(`${r.status === 0 ? "vitest related: pass" : "vitest related: FAILED"} (${files.join(", ")})\n${keep.join("\n")}`);
});
