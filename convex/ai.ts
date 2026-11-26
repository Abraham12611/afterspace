/**
 * Model routing for the whole app. Every chat call goes through OpenRouter
 * (convex/openrouter.ts, the only file that calls a model). The job names the
 * feature, MODEL_BY_JOB below picks the tier, and MODELS names the model id for
 * each tier, so swapping a model is one line here.
 *
 * Without OPENROUTER_API_KEY there is no chat target: completeJson returns null
 * and every caller degrades to its canned output, the same as a model that
 * answered prose.
 *
 * Model ids were picked from https://openrouter.ai/api/v1/models (public list):
 *
 * | tier   | model                | why |
 * |--------|----------------------|-----|
 * | fast   | openai/gpt-4o-mini   | cheap ($0.15 / $0.60 per M tokens), low latency, not a reasoning model so a capped answer is not eaten by thinking, and the only cheap one that lists `response_format` AND `logprobs`/`top_logprobs` (the decide pass reads one-token logprobs); also reads images |
 * | mid    | openai/gpt-4.1-mini  | better instruction following for asks that need group facts, multi-card deals, recaps and cited answers ($0.40 / $1.60); `response_format` + `structured_outputs`, 1M context so a whole room brief fits |
 * | vision | openai/gpt-4.1-mini  | reads receipt photos and returns JSON ($0.40 / $1.60); its own tier so the receipt model can change without touching the text jobs |
 */

/** Which price row and model id a job uses. */
export type ModelTier = "fast" | "mid" | "vision";

/** OpenRouter model id per tier. */
export const MODELS: Record<ModelTier, string> = {
  fast: "openai/gpt-4o-mini",
  mid: "openai/gpt-4.1-mini",
  vision: "openai/gpt-4.1-mini",
};

/** Which feature is calling. The model follows from the job. */
export type AiJob =
  | "deal" // a voice ask: plain asks, fills cards (voiceBuild.ts)
  | "brain" // a voice ask that needs the group's facts, or several cards
  | "decide" // which card does this ask want (one-token pick)
  | "ask" // ask the space: one cited answer
  | "recap" // "catch me up"
  | "questions" // question of the day, conversation starters
  | "epitaph" // one funny sentence for the graveyard
  | "game" // game setup wording
  | "receipt"; // receipt photo -> JSON

export type JobSpec = { tier: ModelTier; maxTokens: number; temperature: number };

/**
 * | job       | feature (caller)                              | tier   |
 * |-----------|-----------------------------------------------|--------|
 * | deal      | plain voice asks (voiceBuild.ts)              | fast   |
 * | brain     | asks that need group facts, multi-card        | mid    |
 * | decide    | which card (voiceBuild.ts decide)             | fast   |
 * | ask       | answer from the room's facts (voiceBuild.ts)  | mid    |
 * | recap     | "catch me up" (recap.ts)                      | mid    |
 * | questions | question of the day (questions.ts)            | fast   |
 * | epitaph   | graveyard line                                | fast   |
 * | game      | game setup wording (games.ts)                 | mid    |
 * | receipt   | receipt photo to JSON                         | vision |
 */
export const MODEL_BY_JOB: Record<AiJob, JobSpec> = {
  deal: { tier: "fast", maxTokens: 220, temperature: 0 },
  brain: { tier: "mid", maxTokens: 300, temperature: 0 },
  decide: { tier: "fast", maxTokens: 1, temperature: 0 },
  ask: { tier: "mid", maxTokens: 300, temperature: 0 },
  recap: { tier: "mid", maxTokens: 1024, temperature: 0.7 },
  questions: { tier: "fast", maxTokens: 400, temperature: 0.7 },
  epitaph: { tier: "fast", maxTokens: 80, temperature: 0.8 },
  game: { tier: "mid", maxTokens: 320, temperature: 0 },
  receipt: { tier: "vision", maxTokens: 600, temperature: 0 },
};
