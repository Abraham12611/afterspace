import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Room radio "now playing". The audio is Radio Paradise (SomaFM 403s browsers),
// and RP's now_playing API has no CORS header, so the title comes through here.
// Serenity has no API channel: its title is sniffed off the stream's ICY metadata.
const RADIO_CHANNELS: Record<string, number | "serenity"> = {
  indiepop: 0,
  groovesalad: 1,
  lush: "serenity",
  folkfwd: 3,
  poptron: 2,
  thetrip: 5,
};

async function icyTitle(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { "Icy-MetaData": "1" },
      signal: controller.signal,
    });
    const metaint = Number(response.headers.get("icy-metaint"));
    if (!metaint || !response.body) return null;
    const reader = response.body.getReader();
    let buf = new Uint8Array(0);
    while (buf.length < metaint + 4096) {
      const { value, done } = await reader.read();
      if (done) break;
      const next = new Uint8Array(buf.length + value.length);
      next.set(buf);
      next.set(value, buf.length);
      buf = next;
    }
    controller.abort();
    const len = (buf[metaint] ?? 0) * 16;
    const meta = new TextDecoder().decode(buf.slice(metaint + 1, metaint + 1 + len));
    const title = meta.match(/StreamTitle='([^']*)'/)?.[1] ?? "";
    const dash = title.indexOf(" - ");
    if (dash < 0) return null;
    return { artist: title.slice(0, dash), title: title.slice(dash + 3) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

http.route({
  path: "/radio/now",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const station = new URL(request.url).searchParams.get("station") ?? "";
    const chan = RADIO_CHANNELS[station];
    let track: { artist: string; title: string } | null = null;
    if (chan === "serenity") {
      track = await icyTitle("https://stream.radioparadise.com/serenity");
    } else if (typeof chan === "number") {
      try {
        const data = (await (
          await fetch(`https://api.radioparadise.com/api/now_playing?chan=${chan}`)
        ).json()) as { artist?: string; title?: string | null };
        track = data.artist && data.title ? { artist: data.artist, title: data.title } : null;
      } catch {
        track = null;
      }
    }
    return new Response(JSON.stringify({ track }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }),
});

// Convex Auth's HTTP routes, minus the two OIDC discovery documents. Those
// must live at the root and this router is under httpPrefix "/api", so the
// authWellKnown component serves them (convex.config.ts). The OAuth start +
// callback routes the library registers as "/api/auth/…" are re-homed here
// as "/auth/…", which the prefix then serves at exactly the "/api/auth/…"
// URLs the library redirects to. Guest sign-in never touches these.
const authRoutes = httpRouter();
auth.addHttpRoutes(authRoutes);
for (const [path, method, handler] of authRoutes.getRoutes()) {
  if (!path.startsWith("/api/auth/")) continue;
  const local = path.slice("/api".length);
  if (local.endsWith("*")) {
    http.route({ pathPrefix: local.slice(0, -1), method, handler });
  } else {
    http.route({ path: local, method, handler });
  }
}

export default http;
