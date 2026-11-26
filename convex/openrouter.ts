import { v } from "convex/values";
import { internalAction, env } from "./_generated/server";
import { MODEL_BY_JOB, MODELS, type AiJob, type ModelTier } from "./ai";

/**
 * OpenRouter: the only file that calls a model (docs/plan/03-architecture/openrouter.md).
 * The standard OpenAI-style chat-completions API at openrouter.ai/api/v1;
 * convex/ai.ts picks the model per job (MODEL_BY_JOB) and this file owns the
 * endpoint, the key (OPENROUTER_API_KEY, a Convex env var) and the clients:
 *
 * - `streamChat`: streamed text for the voice hot path (server-sent events).
 * - `completeJson`: one non-streamed call, parsed JSON, `null` on any failure.
 * - `chooseLetter`: one-token multiple choice with logprobs (the decide pass).
 *
 * Without a key `chatTarget` returns null and every caller falls back to its
 * canned output. The spend guard and the per-seat limiter sit in front of
 * these calls, at the call site (convex/guard.ts `voice` / `modelDoor`), because
 * they are mutations and these helpers take no ctx; afterwards callers report
 * usage with `guard.noteSpend`, which also writes the `modelCalls` metrics row
 * (job, model, ms, tokens, usd; never prompt text).
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** The OpenRouter key, or undefined when this deployment has none (canned AI). */
export function openrouterKey(): string | undefined {
  return env.OPENROUTER_API_KEY?.trim() || undefined;
}

/** App attribution headers; HTTP-Referer is the site, X-Title the app name. */
function headers(key: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Title": "Afterspace",
  };
  const site = env.SITE_URL?.trim();
  if (site) h["HTTP-Referer"] = site;
  return h;
}

/** A user message part: text, or an image (a URL or a `data:image/jpeg;base64,...` URL). */
export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

export type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  /** OpenRouter reports the cost in credits (USD) when usage accounting is on. */
  cost?: number;
};

export type ChatTarget = { url: string; token: string; model: string; tier: ModelTier; maxTokens: number; temperature: number };

/** Where a job's chat call goes, or null when this deployment has no key. */
export function chatTarget(job: AiJob): ChatTarget | null {
  const token = openrouterKey();
  if (!token) return null;
  const spec = MODEL_BY_JOB[job];
  return {
    url: `${OPENROUTER_BASE_URL}/chat/completions`,
    token,
    model: MODELS[spec.tier],
    tier: spec.tier,
    maxTokens: spec.maxTokens,
    temperature: spec.temperature,
  };
}

export type StreamResult = {
  status: number;
  content: string;
  usage: ChatUsage | null;
  finish: string | null;
  /** ms from request start; null when it never happened. */
  firstTokenMs: number | null;
  firstLineMs: number | null;
  totalMs: number;
  error?: string;
};

/** Streams one chat completion. `onLine` fires for each complete line of
 * content as it arrives, so a one-card-per-line answer can commit its first
 * card before the rest is written. Never throws: failures come back as a
 * status and an error string. */
export async function streamChat(opts: {
  job: AiJob;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  onLine?: (line: string, ms: number) => void;
  /** The whole answer so far, after every piece of it that arrives. */
  onText?: (content: string, ms: number) => void;
}): Promise<StreamResult> {
  const t0 = Date.now();
  const ms = () => Date.now() - t0;
  const out: StreamResult = {
    status: 0,
    content: "",
    usage: null,
    finish: null,
    firstTokenMs: null,
    firstLineMs: null,
    totalMs: 0,
  };
  const target = chatTarget(opts.job);
  if (!target) {
    out.error = "OPENROUTER_API_KEY is not set";
    return out;
  }
  let pending = "";
  const emit = (line: string) => {
    if (!line.trim()) return;
    if (out.firstLineMs === null) out.firstLineMs = ms();
    opts.onLine?.(line, ms());
  };
  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers: headers(target.token),
      body: JSON.stringify({
        model: target.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? target.maxTokens,
        temperature: opts.temperature ?? target.temperature,
        stream: true,
        stream_options: { include_usage: true },
        usage: { include: true },
      }),
    });
    out.status = res.status;
    if (!res.ok || !res.body) {
      out.error = (await res.text()).slice(0, 400);
      return out;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const event = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        // SSE comments (": OPENROUTER PROCESSING") and blanks are keep-alives
        if (!event.startsWith("data:")) continue;
        const data = event.slice(5).trim();
        if (data === "[DONE]") continue;
        let chunk: {
          usage?: ChatUsage;
          error?: { message?: string };
          choices?: { finish_reason?: string | null; delta?: { content?: string | null } }[];
        };
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) out.error = (chunk.error.message ?? "stream error").slice(0, 400);
        if (chunk.usage) out.usage = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) out.finish = choice.finish_reason;
        const text = choice.delta?.content ?? "";
        if (!text) continue;
        if (out.firstTokenMs === null) out.firstTokenMs = ms();
        out.content += text;
        opts.onText?.(out.content, ms());
        pending += text;
        let cut;
        while ((cut = pending.indexOf("\n")) >= 0) {
          emit(pending.slice(0, cut));
          pending = pending.slice(cut + 1);
        }
      }
    }
    emit(pending);
  } catch (e) {
    out.error = String(e).slice(0, 400);
  }
  out.totalMs = ms();
  return out;
}

/** Salvages the object out of a reply that wrapped its JSON in prose. The shape
 * is checked against nothing; each caller coerces the fields it needs. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * One-shot structured extraction: prompt in, one JSON object out. Takes no ctx,
 * so retry, cache and quota live at the call site (workpool + rate limiter in
 * recap.ts, an action cache in questions.ts). Returns null for every "no usable
 * JSON" case (no key, HTTP error, network failure, prose), so callers degrade to
 * canned output. `images` rides on the user message as image parts, for the
 * vision tier (receipts).
 */
export async function completeJson(args: {
  job: AiJob;
  system: string;
  user: string;
  /** Image URLs or `data:image/...;base64,` URLs, sent with the user text. */
  images?: string[];
  temperature?: number;
  maxTokens?: number;
}): Promise<Record<string, unknown> | null> {
  return (await completeJsonWithUsage(args)).json;
}

/** Same as completeJson, plus the usage and timing, for call sites that report spend. */
export async function completeJsonWithUsage(args: {
  job: AiJob;
  system: string;
  user: string;
  images?: string[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ json: Record<string, unknown> | null; usage: ChatUsage | null; ms: number }> {
  const t0 = Date.now();
  const target = chatTarget(args.job);
  if (!target) return { json: null, usage: null, ms: 0 };
  const userContent: string | ContentPart[] = args.images?.length
    ? [{ type: "text", text: args.user }, ...args.images.map((url): ContentPart => ({ type: "image_url", image_url: { url } }))]
    : args.user;
  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: headers(target.token),
      body: JSON.stringify({
        model: target.model,
        temperature: args.temperature ?? target.temperature,
        max_tokens: args.maxTokens ?? Math.max(target.maxTokens, 600),
        response_format: { type: "json_object" },
        usage: { include: true },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!response.ok) return { json: null, usage: null, ms: Date.now() - t0 };
    const payload = (await response.json()) as {
      usage?: ChatUsage;
      choices?: { message?: { content?: string } }[];
    };
    return {
      json: parseJsonObject(payload.choices?.[0]?.message?.content ?? ""),
      usage: payload.usage ?? null,
      ms: Date.now() - t0,
    };
  } catch {
    return { json: null, usage: null, ms: Date.now() - t0 };
  }
}

/** A free request to OpenRouter (the key check, no tokens): wakes the action
 * runtime and the connection before a voice ask needs them. */
export async function pingOpenRouter(): Promise<{ status: number; ms: number }> {
  const key = openrouterKey();
  const t0 = Date.now();
  if (!key) return { status: 0, ms: 0 };
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/key`, { headers: { Authorization: `Bearer ${key}` } });
    await res.body?.cancel();
    return { status: res.status, ms: Date.now() - t0 };
  } catch {
    return { status: 0, ms: Date.now() - t0 };
  }
}

const JOBS = Object.keys(MODEL_BY_JOB) as AiJob[];

/** Where each AI job's chat call goes on this deployment: host and model,
 * never the key. Without OPENROUTER_API_KEY every row reads kind "none" and
 * the app runs on canned output (`npx convex run openrouter:routes`). */
export const routes = internalAction({
  args: {},
  returns: v.array(v.object({ job: v.string(), kind: v.string(), host: v.string(), model: v.string() })),
  handler: async () =>
    JOBS.map((job) => {
      const target = chatTarget(job);
      return {
        job,
        kind: target ? "openrouter" : "none",
        host: target ? new URL(target.url).host : "",
        model: target?.model ?? "",
      };
    }),
});

export type LetterResult = {
  status: number;
  /** The most likely valid letter, its probability (summed over token variants), and the runners-up. */
  letter: string | null;
  conf: number | null;
  top: { letter: string; p: number }[];
  usage: ChatUsage | null;
  ms: number;
  error?: string;
};

/** One-token multiple choice with logprobs (the decide pass). Never throws.
 * Requires a provider that returns logprobs (`provider.require_parameters`), so
 * OpenRouter does not silently route to one that drops them. Duplicate token
 * strings are counted once, and " E" and "E" add up. If no logprobs come back
 * the model's own one-letter answer is used, with `conf` null (not trusted). */
export async function chooseLetter(opts: { job?: AiJob; messages: ChatMessage[]; letters: string[] }): Promise<LetterResult> {
  const t0 = Date.now();
  const out: LetterResult = { status: 0, letter: null, conf: null, top: [], usage: null, ms: 0 };
  const target = chatTarget(opts.job ?? "decide");
  if (!target) return { ...out, error: "OPENROUTER_API_KEY is not set" };
  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers: headers(target.token),
      body: JSON.stringify({
        model: target.model,
        messages: opts.messages,
        max_tokens: 1,
        temperature: 0,
        logprobs: true,
        top_logprobs: 20,
        usage: { include: true },
        provider: { require_parameters: true },
      }),
    });
    out.status = res.status;
    const text = await res.text();
    if (!res.ok) return { ...out, ms: Date.now() - t0, error: text.slice(0, 400) };
    const j = JSON.parse(text) as {
      usage?: ChatUsage;
      choices?: { message?: { content?: string }; logprobs?: { content?: { top_logprobs?: { token: string; logprob: number }[] }[] } }[];
    };
    out.usage = j.usage ?? null;
    const probs = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of j.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs ?? []) {
      if (seen.has(t.token)) continue;
      seen.add(t.token);
      const k = t.token.trim();
      if (opts.letters.includes(k)) probs.set(k, (probs.get(k) ?? 0) + Math.exp(t.logprob));
    }
    out.top = [...probs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([letter, p]) => ({ letter, p: Math.round(p * 1000) / 1000 }));
    const said = (j.choices?.[0]?.message?.content ?? "").trim().toUpperCase().slice(0, 1);
    out.letter = out.top[0]?.letter ?? (opts.letters.includes(said) ? said : null);
    out.conf = out.top[0]?.p ?? null;
  } catch (e) {
    out.error = String(e).slice(0, 400);
  }
  out.ms = Date.now() - t0;
  return out;
}
