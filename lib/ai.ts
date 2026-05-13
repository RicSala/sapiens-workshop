import { anthropic } from "@ai-sdk/anthropic";

export const DEFAULT_MODEL_ID = "claude-opus-4-7";
export const MODULE_MODEL_ID = "claude-sonnet-4-6";

export const defaultModel = anthropic(DEFAULT_MODEL_ID);
export const moduleModel = anthropic(MODULE_MODEL_ID);
