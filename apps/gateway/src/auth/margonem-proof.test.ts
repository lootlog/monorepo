import { describe, expect, mock, test } from "bun:test";
import { Effect, Fiber } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeMargonemProofVerifier } from "./margonem-proof.js";
import type { GatewayConfiguration } from "#src/config/gateway-config";

const config = {
  margonemSigningKeyUrl: "https://margonem.example/signing-key.pem",
} as GatewayConfiguration;

const proofOptions = () => {
  const accountId = "7";
  const characterId = "11";
  const socketId = "connection-1";
  const token = `lootlog:${socketId}:${accountId}:02${BigInt(characterId)
    .toString(16)
    .padStart(16, "0")}ffffffffffffffff${"a".repeat(32)}`;
  const ts = Date.now();
  return {
    accountId,
    characterId,
    socketId,
    proof: {
      userId: accountId,
      characterId,
      token,
      ts,
      validatedString: `${accountId}+${token}+${ts}`,
      signatureBase64: "invalid-signature",
    },
  };
};

const response = (body: Uint8Array) => ({
  status: 200,
  arrayBuffer: Effect.succeed(body.buffer),
});

describe("Margonem proof verifier", () => {
  test("rejects malformed proof without an outbound request", async () => {
    const get = mock(() => Effect.die("HTTP must not run"));
    const verifier = makeMargonemProofVerifier(config, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(
        verifier.verify({ ...proofOptions(), proof: { malformed: true } }),
      ),
    ).resolves.toEqual({ valid: false, reason: "missing or malformed proof" });
    expect(get).not.toHaveBeenCalled();
  });

  test("performs one forced idempotent key refresh after signature rejection", async () => {
    const get = mock(() =>
      Effect.succeed(
        response(
          new TextEncoder().encode("-----BEGIN PUBLIC KEY-----\ninvalid\n"),
        ),
      ),
    );
    const verifier = makeMargonemProofVerifier(config, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(verifier.verify(proofOptions())),
    ).resolves.toEqual({ valid: false, reason: "invalid proof signature" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("rejects oversized key responses and bounds the refresh attempts", async () => {
    const get = mock(() =>
      Effect.succeed(response(new Uint8Array(64 * 1_024 + 1))),
    );
    const verifier = makeMargonemProofVerifier(config, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(verifier.verify(proofOptions())),
    ).resolves.toEqual({ valid: false, reason: "invalid proof signature" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("propagates interruption to the signing-key request", async () => {
    let interrupted = false;
    const get = mock(() =>
      Effect.never.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true;
          }),
        ),
      ),
    );
    const verifier = makeMargonemProofVerifier(config, {
      get,
    } as unknown as HttpClientValue);
    const fiber = Effect.runFork(verifier.verify(proofOptions()));
    while (get.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(interrupted).toBe(true);
  });
});
