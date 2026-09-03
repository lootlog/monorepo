import { createHash, randomBytes } from "node:crypto";
import { Schema } from "effect";

export const REALTIME_TICKET_TTL_SECONDS = 30;

export interface RealtimeTicketIdentity {
  readonly userId: string;
  readonly discordId: string;
}

interface StoredRealtimeTicket extends RealtimeTicketIdentity {
  readonly origin: string;
}

const StoredRealtimeTicketSchema = Schema.fromJsonString(
  Schema.Struct({
    userId: Schema.NonEmptyString,
    discordId: Schema.NonEmptyString,
    origin: Schema.String,
  }),
);
const decodeStoredRealtimeTicket = Schema.decodeUnknownSync(
  StoredRealtimeTicketSchema,
);

export interface RealtimeTicketRedis {
  readonly set: (
    key: string,
    value: string,
    mode: "EX",
    ttl: number,
    condition: "NX",
  ) => Promise<unknown>;
  readonly getdel: (key: string) => Promise<string | null>;
}

const keyFor = (ticket: string): string =>
  `auth:realtime-ticket:${createHash("sha256").update(ticket).digest("hex")}`;

export const issueRealtimeTicket = async (
  redis: RealtimeTicketRedis,
  identity: RealtimeTicketIdentity,
  origin: string,
  now = Date.now,
): Promise<{ readonly ticket: string; readonly expiresAt: number }> => {
  const ticket = randomBytes(32).toString("base64url");
  const stored = await redis.set(
    keyFor(ticket),
    JSON.stringify({ ...identity, origin } satisfies StoredRealtimeTicket),
    "EX",
    REALTIME_TICKET_TTL_SECONDS,
    "NX",
  );
  if (stored !== "OK") throw new Error("Failed to persist realtime ticket");
  return {
    ticket,
    expiresAt: now() + REALTIME_TICKET_TTL_SECONDS * 1_000,
  };
};

export const consumeRealtimeTicket = async (
  redis: RealtimeTicketRedis,
  ticket: string,
  origin: string,
): Promise<RealtimeTicketIdentity | null> => {
  const raw = await redis.getdel(keyFor(ticket));
  if (!raw) return null;
  try {
    const stored = decodeStoredRealtimeTicket(raw);
    if (stored.origin !== origin) return null;
    return { userId: stored.userId, discordId: stored.discordId };
  } catch {
    return null;
  }
};
