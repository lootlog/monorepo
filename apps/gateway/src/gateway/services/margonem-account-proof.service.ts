import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { verify } from "node:crypto";
import { firstValueFrom } from "rxjs";
import { env } from "src/config/env";
import type { MargonemAccountProofDto } from "src/gateway/dto/join-gateway.dto";

const REQUEST_TIMEOUT_MS = 10000;
const KEY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_PROOF_AGE_MS = 120 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;
const TOKEN_PREFIX = "lootlog";
const NONCE_PATTERN = /^[a-f0-9]{32,128}$/;

type VerifyMargonemAccountProofInput = {
  proof: MargonemAccountProofDto | undefined;
  socketId: string;
  accountId: string;
};

export type MargonemAccountProofVerificationResult =
  | { valid: true }
  | { valid: false; reason: string };

@Injectable()
export class MargonemAccountProofService {
  private readonly logger = new Logger(MargonemAccountProofService.name);
  private cachedPublicKey: { pem: string; expiresAt: number } | null = null;

  constructor(private readonly httpService: HttpService) {}

  async verifyProof({
    proof,
    socketId,
    accountId,
  }: VerifyMargonemAccountProofInput): Promise<MargonemAccountProofVerificationResult> {
    const validation = this.validateProofShape({ proof, socketId, accountId });

    if (!validation.valid) {
      return validation;
    }

    const signatureResult = await this.verifySignature(
      proof.validatedString,
      proof.signatureBase64,
    );

    if (!signatureResult.valid) {
      return signatureResult;
    }

    return { valid: true };
  }

  private validateProofShape({
    proof,
    socketId,
    accountId,
  }: VerifyMargonemAccountProofInput): MargonemAccountProofVerificationResult {
    if (!proof) {
      return { valid: false, reason: "missing proof" };
    }

    if (proof.userId !== accountId) {
      return { valid: false, reason: "proof account mismatch" };
    }

    if (
      proof.validatedString !== `${proof.userId}+${proof.token}+${proof.ts}`
    ) {
      return { valid: false, reason: "validated string mismatch" };
    }

    const expectedTokenPrefix = `${TOKEN_PREFIX}:${socketId}:${accountId}:`;

    if (!proof.token.startsWith(expectedTokenPrefix)) {
      return { valid: false, reason: "proof token mismatch" };
    }

    const nonce = proof.token.slice(expectedTokenPrefix.length);

    if (!NONCE_PATTERN.test(nonce)) {
      return { valid: false, reason: "invalid proof nonce" };
    }

    const timestampValidation = this.validateTimestamp(proof.ts);

    if (!timestampValidation.valid) {
      return timestampValidation;
    }

    return { valid: true };
  }

  private validateTimestamp(
    timestamp: number,
  ): MargonemAccountProofVerificationResult {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return { valid: false, reason: "invalid proof timestamp" };
    }

    const timestampMs =
      timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
    const now = Date.now();

    if (timestampMs < now - MAX_PROOF_AGE_MS) {
      return { valid: false, reason: "stale proof timestamp" };
    }

    if (timestampMs > now + MAX_FUTURE_SKEW_MS) {
      return { valid: false, reason: "future proof timestamp" };
    }

    return { valid: true };
  }

  private async verifySignature(
    validatedString: string,
    signatureBase64: string,
  ): Promise<MargonemAccountProofVerificationResult> {
    const firstResult = await this.verifySignatureWithCachedKey({
      validatedString,
      signatureBase64,
      forceRefresh: false,
    });

    if (firstResult.valid) {
      return firstResult;
    }

    return this.verifySignatureWithCachedKey({
      validatedString,
      signatureBase64,
      forceRefresh: true,
    });
  }

  private async verifySignatureWithCachedKey({
    validatedString,
    signatureBase64,
    forceRefresh,
  }: {
    validatedString: string;
    signatureBase64: string;
    forceRefresh: boolean;
  }): Promise<MargonemAccountProofVerificationResult> {
    try {
      const publicKey = await this.getPublicKey(forceRefresh);
      const signature = Buffer.from(signatureBase64, "base64");
      const valid = verify(
        "sha256",
        Buffer.from(validatedString),
        publicKey,
        signature,
      );

      if (!valid) {
        return { valid: false, reason: "invalid proof signature" };
      }

      return { valid: true };
    } catch (error) {
      this.logger.warn(
        `Failed to verify Margonem account proof: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return { valid: false, reason: "proof verification failed" };
    }
  }

  private async getPublicKey(forceRefresh: boolean): Promise<string> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cachedPublicKey &&
      this.cachedPublicKey.expiresAt > now
    ) {
      return this.cachedPublicKey.pem;
    }

    const response = await firstValueFrom(
      this.httpService.get<string>(env.MARGONEM_SIGNING_KEY_URL, {
        responseType: "text",
        timeout: REQUEST_TIMEOUT_MS,
      }),
    );
    const pem = response.data.trim();

    if (!pem.includes("BEGIN PUBLIC KEY")) {
      throw new Error("Margonem signing key response is not a public key");
    }

    this.cachedPublicKey = {
      pem,
      expiresAt: now + KEY_CACHE_TTL_MS,
    };

    return pem;
  }
}
