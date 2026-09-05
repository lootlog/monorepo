import { z } from "zod";

// Extension CSP forbids even Zod's caught dynamic-code capability probe.
z.config({ jitless: true });

export const EXTENSION_CHANNEL = "lootlog.extension.v1";
export const MAX_MESSAGE_LENGTH = 20 * 1024 * 1024;
export const MAX_PENDING_REQUESTS = 64;
export const REQUEST_TIMEOUT_MS = 30_000;

const id = z.string().min(1).max(80);
export const ExtensionRequestSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("http"),
    id,
    request: z.strictObject({
      url: z.string().max(8192),
      method: z.string().max(10),
      headers: z.record(z.string().max(100), z.string().max(8192)),
      body: z.string().optional(),
    }),
  }),
  z.strictObject({ type: z.literal("cancel"), id }),
  z.strictObject({ type: z.literal("connect"), id }),
  z.strictObject({ type: z.literal("disconnect"), id }),
  z.strictObject({ type: z.literal("release"), id }),
  z.strictObject({ type: z.literal("command"), id, command: z.unknown() }),
]);
export type ExtensionRequest = z.infer<typeof ExtensionRequestSchema>;

export const ExtensionMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("reset") }),
  z.object({ type: z.literal("closed") }),
  z.object({ type: z.literal("result"), id, data: z.unknown() }),
  z.object({
    type: z.literal("error"),
    id,
    message: z.string(),
    code: z.string().optional(),
    retryable: z.boolean().optional(),
    retryAfterMs: z.number().optional(),
  }),
  z.object({
    type: z.literal("state"),
    state: z.enum([
      "disconnected",
      "connecting",
      "connected",
      "joining",
      "ready",
      "reconnecting",
    ]),
  }),
  z.object({ type: z.literal("event"), event: z.unknown() }),
]);
export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;

export function decodeMessage(value: unknown): unknown {
  if (typeof value !== "string" || value.length > MAX_MESSAGE_LENGTH)
    throw new Error("Invalid extension message");
  return JSON.parse(value);
}

export function encodeMessage(
  value: ExtensionRequest | ExtensionMessage,
): string {
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_MESSAGE_LENGTH)
    throw new Error("Extension message too large");
  return serialized;
}
