// Shared helpers for Kiro hook scripts in .kiro/hooks/. Each hook receives JSON on stdin.
const readStdin = () =>
  new Promise((resolve) => {
    let s = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.on("data", (d) => (s += d)).on("end", () => resolve(s));
  });

/** Every file path mentioned in the hook payload (tool input or file event), whatever the key is called. */
function pathsIn(raw) {
  const found = new Set();
  const walk = (v, key) => {
    if (typeof v === "string") {
      if (/^(file_?path|path|targetFile|target_file|filePath)$/i.test(key ?? "")) found.add(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  try { walk(JSON.parse(raw)); } catch { /* not JSON: no paths */ }
  return [...found];
}

module.exports = { readStdin, pathsIn };
