import { anthropic } from "@ai-sdk/anthropic";

// Temporarily downgraded to Haiku 4.5 for cheaper iteration.
// Restore: DEFAULT_MODEL_ID = "claude-opus-4-7", MODULE_MODEL_ID = "claude-sonnet-4-6"
export const DEFAULT_MODEL_ID = "claude-haiku-4-5";
export const MODULE_MODEL_ID = "claude-haiku-4-5";

export const defaultModel = anthropic(DEFAULT_MODEL_ID);
export const moduleModel = anthropic(MODULE_MODEL_ID);
