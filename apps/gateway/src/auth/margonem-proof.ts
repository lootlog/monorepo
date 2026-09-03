import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { verify as verifySignatureValue } from "node:crypto";
import { Clock, Effect, Option, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { GatewayConfiguration } from "#src/config/gateway-config";

const KEY_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;
const MAX_PROOF_AGE_MS = 120_000;
const MAX_FUTURE_SKEW_MS = 30_000;
const MAX_KEY_RESPONSE_BYTES = 64 * 1_024;
const TOKEN_PREFIX = "lootlog";
const TOKEN_VERSION_PREFIX = "02";
const NO_CLAN_HEX = "ffffffffffffffff";
const ENCODED_ID_HEX_LENGTH = 16;
const NONCE_PATTERN = /^[a-f0-9]{32}$/;

const Proof = Schema.Struct({
  userId: Schema.String,
  characterId: Schema.String,
  clanId: Schema.optional(Schema.Number),
  token: Schema.String,
  ts: Schema.Number,
  validatedString: Schema.String,
  signatureBase64: Schema.String,
});
const decodeProof = Schema.decodeUnknownOption(Proof);

export type ProofVerification =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

export interface ProofVerificationOptions {
  readonly proof: unknown;
  readonly socketId: string;
  readonly accountId: string;
  readonly characterId: string;
  readonly clanId?: number;
}

export class MargonemSigningKeyFailure extends TaggedErrorClass<MargonemSigningKeyFailure>()(
  "MargonemSigningKeyFailure",
  {
    reason: Schema.Literals([
      "invalid-response",
      "response-too-large",
      "status",
      "timeout",
      "transport",
    ]),
    status: Schema.optional(Schema.Number),
  },
) {}

export interface MargonemProofVerifier {
  readonly verify: (
    options: ProofVerificationOptions,
  ) => Effect.Effect<ProofVerification>;
}

const invalid = (
  reason: string,
): { readonly valid: false; readonly reason: string } => ({
  valid: false,
  reason,
});

const parseToken = (
  payload: string,
):
  | {
      readonly valid: true;
      readonly characterId: string;
      readonly clanId?: string;
      readonly nonce: string;
    }
  | { readonly valid: false; readonly reason: string } => {
  const length = TOKEN_VERSION_PREFIX.length + ENCODED_ID_HEX_LENGTH * 2 + 32;
  if (payload.length !== length || !payload.startsWith(TOKEN_VERSION_PREFIX)) {
    return invalid("invalid proof token payload");
  }
  const characterHex = payload.slice(2, 18);
  const clanHex = payload.slice(18, 34);
  const nonce = payload.slice(34);
  if (!/^[a-f0-9]{16}$/.test(characterHex) || !/^[a-f0-9]{16}$/.test(clanHex)) {
    return invalid("invalid proof token payload");
  }
  return {
    valid: true,
    characterId: BigInt(`0x${characterHex}`).toString(10),
    clanId:
      clanHex === NO_CLAN_HEX ? undefined : BigInt(`0x${clanHex}`).toString(10),
    nonce,
  };
};

export const makeMargonemProofVerifier = (
  config: GatewayConfiguration,
  httpClient: HttpClientValue,
): MargonemProofVerifier => {
  let cachedKey: { readonly pem: string; readonly expiresAt: number } | null =
    null;

  const getKey = Effect.fn("MargonemProofVerifier_getKey")(function* (
    forceRefresh: boolean,
  ) {
    const now = yield* Clock.currentTimeMillis;
    if (!forceRefresh && cachedKey && cachedKey.expiresAt > now) {
      return cachedKey.pem;
    }

    const response = yield* httpClient.get(config.margonemSigningKeyUrl).pipe(
      Effect.timeout("10 seconds"),
      Effect.mapError(
        (error) =>
          new MargonemSigningKeyFailure({
            reason: error._tag === "TimeoutError" ? "timeout" : "transport",
          }),
      ),
    );
    if (response.status < 200 || response.status >= 300) {
      return yield* new MargonemSigningKeyFailure({
        reason: "status",
        status: response.status,
      });
    }
    const body = yield* response.arrayBuffer.pipe(
      Effect.mapError(
        () => new MargonemSigningKeyFailure({ reason: "invalid-response" }),
      ),
    );
    if (body.byteLength > MAX_KEY_RESPONSE_BYTES) {
      return yield* new MargonemSigningKeyFailure({
        reason: "response-too-large",
      });
    }
    const pem = new TextDecoder().decode(body).trim();
    if (!pem.includes("BEGIN PUBLIC KEY")) {
      return yield* new MargonemSigningKeyFailure({
        reason: "invalid-response",
      });
    }
    cachedKey = { pem, expiresAt: now + KEY_CACHE_TTL_MS };
    return pem;
  });

  const verifyCryptographicSignature = Effect.fn(
    "MargonemProofVerifier_verifySignature",
  )(function* (value: string, signatureBase64: string) {
    for (const [retryCount, forceRefresh] of [false, true].entries()) {
      const key = yield* getKey(forceRefresh).pipe(
        Effect.withSpan("MargonemProofVerifier_getKey.attempt", {
          attributes: { adapter: "margonem-signing-key", retryCount },
        }),
        Effect.option,
      );
      const signatureValid = Option.isSome(key)
        ? yield* Effect.try({
            try: () =>
              verifySignatureValue(
                "sha256",
                Buffer.from(value),
                key.value,
                Buffer.from(signatureBase64, "base64"),
              ),
            catch: () =>
              new MargonemSigningKeyFailure({ reason: "invalid-response" }),
          }).pipe(Effect.orElseSucceed(() => false))
        : false;
      if (signatureValid) {
        return { valid: true } as const;
      }
    }
    return invalid("invalid proof signature");
  });

  const verifyProof = Effect.fn("MargonemProofVerifier_verify")(function* (
    options: ProofVerificationOptions,
  ) {
    const parsed = decodeProof(options.proof);
    if (Option.isNone(parsed)) return invalid("missing or malformed proof");
    const proof = parsed.value;
    if (proof.userId !== options.accountId) {
      return invalid("proof account mismatch");
    }
    if (proof.characterId !== options.characterId) {
      return invalid("proof character mismatch");
    }
    if (String(proof.clanId ?? "") !== String(options.clanId ?? "")) {
      return invalid("proof clan mismatch");
    }
    if (
      proof.validatedString !== `${proof.userId}+${proof.token}+${proof.ts}`
    ) {
      return invalid("validated string mismatch");
    }
    const prefix = `${TOKEN_PREFIX}:${options.socketId}:${options.accountId}:`;
    if (!proof.token.startsWith(prefix)) return invalid("proof token mismatch");
    const payload = parseToken(proof.token.slice(prefix.length));
    if (!payload.valid) return payload;
    if (payload.characterId !== options.characterId) {
      return invalid("proof character mismatch");
    }
    if (String(payload.clanId ?? "") !== String(options.clanId ?? "")) {
      return invalid("proof clan mismatch");
    }
    if (!NONCE_PATTERN.test(payload.nonce))
      return invalid("invalid proof nonce");
    const timestampMs = proof.ts < 10_000_000_000 ? proof.ts * 1_000 : proof.ts;
    const now = yield* Clock.currentTimeMillis;
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return invalid("invalid proof timestamp");
    }
    if (timestampMs < now - MAX_PROOF_AGE_MS) {
      return invalid("stale proof timestamp");
    }
    if (timestampMs > now + MAX_FUTURE_SKEW_MS) {
      return invalid("future proof timestamp");
    }
    return yield* verifyCryptographicSignature(
      proof.validatedString,
      proof.signatureBase64,
    );
  });

  return {
    verify: (options) =>
      verifyProof(options).pipe(
        Effect.withSpan("MargonemProofVerifier_verify", {
          attributes: { adapter: "margonem-proof", retryCount: 0 },
        }),
      ),
  };
};
