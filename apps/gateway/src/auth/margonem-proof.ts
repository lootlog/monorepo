import { verify } from "node:crypto";
import { Option, Schema } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";

const REQUEST_TIMEOUT_MS = 10_000;
const KEY_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;
const MAX_PROOF_AGE_MS = 120_000;
const MAX_FUTURE_SKEW_MS = 30_000;
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

type Verification =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

export class MargonemProofVerifier {
  private cachedKey: {
    readonly pem: string;
    readonly expiresAt: number;
  } | null = null;

  constructor(private readonly config: GatewayConfiguration) {}

  async verify(options: {
    readonly proof: unknown;
    readonly socketId: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly clanId?: number;
  }): Promise<Verification> {
    const parsed = decodeProof(options.proof);
    if (Option.isNone(parsed))
      return { valid: false, reason: "missing or malformed proof" };
    const proof = parsed.value;
    if (proof.userId !== options.accountId)
      return { valid: false, reason: "proof account mismatch" };
    if (proof.characterId !== options.characterId)
      return { valid: false, reason: "proof character mismatch" };
    if (String(proof.clanId ?? "") !== String(options.clanId ?? "")) {
      return { valid: false, reason: "proof clan mismatch" };
    }
    if (
      proof.validatedString !== `${proof.userId}+${proof.token}+${proof.ts}`
    ) {
      return { valid: false, reason: "validated string mismatch" };
    }
    const prefix = `${TOKEN_PREFIX}:${options.socketId}:${options.accountId}:`;
    if (!proof.token.startsWith(prefix))
      return { valid: false, reason: "proof token mismatch" };
    const payload = this.parseToken(proof.token.slice(prefix.length));
    if (!payload.valid) return payload;
    if (payload.characterId !== options.characterId)
      return { valid: false, reason: "proof character mismatch" };
    if (String(payload.clanId ?? "") !== String(options.clanId ?? "")) {
      return { valid: false, reason: "proof clan mismatch" };
    }
    if (!NONCE_PATTERN.test(payload.nonce))
      return { valid: false, reason: "invalid proof nonce" };
    const timestampMs = proof.ts < 10_000_000_000 ? proof.ts * 1_000 : proof.ts;
    const now = Date.now();
    if (!Number.isFinite(timestampMs) || timestampMs <= 0)
      return { valid: false, reason: "invalid proof timestamp" };
    if (timestampMs < now - MAX_PROOF_AGE_MS)
      return { valid: false, reason: "stale proof timestamp" };
    if (timestampMs > now + MAX_FUTURE_SKEW_MS)
      return { valid: false, reason: "future proof timestamp" };
    return this.verifySignature(proof.validatedString, proof.signatureBase64);
  }

  private parseToken(payload: string):
    | {
        readonly valid: true;
        readonly characterId: string;
        readonly clanId?: string;
        readonly nonce: string;
      }
    | { readonly valid: false; readonly reason: string } {
    const length = TOKEN_VERSION_PREFIX.length + ENCODED_ID_HEX_LENGTH * 2 + 32;
    if (
      payload.length !== length ||
      !payload.startsWith(TOKEN_VERSION_PREFIX)
    ) {
      return { valid: false, reason: "invalid proof token payload" };
    }
    const characterHex = payload.slice(2, 18);
    const clanHex = payload.slice(18, 34);
    const nonce = payload.slice(34);
    if (
      !/^[a-f0-9]{16}$/.test(characterHex) ||
      !/^[a-f0-9]{16}$/.test(clanHex)
    ) {
      return { valid: false, reason: "invalid proof token payload" };
    }
    return {
      valid: true,
      characterId: BigInt(`0x${characterHex}`).toString(10),
      clanId:
        clanHex === NO_CLAN_HEX
          ? undefined
          : BigInt(`0x${clanHex}`).toString(10),
      nonce,
    };
  }

  private async verifySignature(
    value: string,
    signatureBase64: string,
  ): Promise<Verification> {
    for (const refresh of [false, true]) {
      try {
        const key = await this.getKey(refresh);
        if (
          verify(
            "sha256",
            Buffer.from(value),
            key,
            Buffer.from(signatureBase64, "base64"),
          )
        ) {
          return { valid: true };
        }
      } catch {
        // One forced refresh is attempted before the proof becomes reported.
      }
    }
    return { valid: false, reason: "invalid proof signature" };
  }

  private async getKey(forceRefresh: boolean): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedKey && this.cachedKey.expiresAt > now)
      return this.cachedKey.pem;
    const response = await fetch(this.config.margonemSigningKeyUrl, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pem = (await response.text()).trim();
    if (!pem.includes("BEGIN PUBLIC KEY"))
      throw new Error("invalid signing key response");
    this.cachedKey = { pem, expiresAt: now + KEY_CACHE_TTL_MS };
    return pem;
  }
}
