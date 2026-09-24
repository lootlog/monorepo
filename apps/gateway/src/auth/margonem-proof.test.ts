import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { describe, expect, mock, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { TestClock } from "effect/testing";
import { Effect, Fiber } from "effect";
import { makeMargonemProofVerifier } from "./margonem-proof.js";

const config = {
  margonemSigningKeyUrl: "https://margonem.example/signing-key.pem",
};

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

const response = (body: Uint8Array) => new Response(new Uint8Array(body));

describe("Margonem proof verifier", () => {
  test("rejects malformed proof without an outbound request", async () => {
    const get = mock(() => Effect.die("HTTP must not run"));

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

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

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(verifier.verify(proofOptions())),
    ).resolves.toEqual({ valid: false, reason: "invalid proof signature" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("rejects oversized key responses and bounds the refresh attempts", async () => {
    const get = mock(() =>
      Effect.succeed(response(new Uint8Array(64 * 1_024 + 1))),
    );

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(verifier.verify(proofOptions())),
    ).resolves.toEqual({ valid: false, reason: "invalid proof signature" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("shares a cold fetch and preserves it when one joining socket disconnects", async () => {
    const responseReady = Promise.withResolvers<Response>();
    const get = mock(() => Effect.promise(() => responseReady.promise));

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    const first = Effect.runFork(verifier.verify(proofOptions()));

    while (get.mock.calls.length === 0) await Bun.sleep(1);
    const other = Effect.runPromise(verifier.verify(proofOptions()));
    await Effect.runPromise(Fiber.interrupt(first));
    responseReady.resolve(
      response(
        new TextEncoder().encode("-----BEGIN PUBLIC KEY-----\ninvalid\n"),
      ),
    );
    expect(await other).toEqual({
      valid: false,
      reason: "invalid proof signature",
    });
    // One shared cold request and at most one shared forced refresh.
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("an invalid-signature join storm performs only one forced refresh per minute", async () => {
    const get = mock(() =>
      Effect.succeed(
        response(
          new TextEncoder().encode("-----BEGIN PUBLIC KEY-----\ninvalid\n"),
        ),
      ),
    );

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        Effect.runPromise(verifier.verify(proofOptions())),
      ),
    );

    expect(results.every((result) => !result.valid)).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    await Effect.runPromise(verifier.verify(proofOptions()));
    expect(get).toHaveBeenCalledTimes(2);
  });
  test("rejects expired cached signing keys throughout a refresh outage", async () => {
    const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });

    const pem = pair.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    let unavailable = false;

    const get = mock(() =>
      Effect.succeed(
        unavailable ? new Response(null, { status: 503 }) : new Response(pem),
      ),
    );

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    const options = proofOptions();

    const signedAt = (ts: number) => {
      const validatedString = `${options.accountId}+${options.proof.token}+${ts}`;

      return {
        ...options,
        proof: {
          ...options.proof,
          ts,
          validatedString,
          signatureBase64: sign(
            "sha256",
            Buffer.from(validatedString),
            pair.privateKey,
          ).toString("base64"),
        },
      };
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* TestClock.setTime(options.proof.ts);
        expect((yield* verifier.verify(signedAt(options.proof.ts))).valid).toBe(
          true,
        );
        unavailable = true;
        const expiredAt = options.proof.ts + 12 * 60 * 60 * 1_000;
        yield* TestClock.setTime(expiredAt);

        for (let attempt = 0; attempt < 8; attempt++) {
          expect(
            (yield* verifier.verify(signedAt(expiredAt + attempt * 20_000)))
              .valid,
          ).toBe(false);
          yield* TestClock.adjust(20_000);
        }
      }).pipe(Effect.provide(TestClock.layer())),
    );
  });

  test("accepts signing-key rotation after the forced refresh window, including a failed refresh", async () => {
    const oldPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const newPair = generateKeyPairSync("rsa", { modulusLength: 2048 });

    let currentPem = oldPair.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    let unavailable = false;

    const get = mock(() =>
      unavailable
        ? Effect.succeed(new Response(null, { status: 503 }))
        : Effect.succeed(new Response(currentPem)),
    );

    const verifier = makeMargonemProofVerifier(
      config,
      httpClientFromResponses(get),
    );

    const options = proofOptions();

    const signed = (key: typeof oldPair.privateKey) => ({
      ...options,
      proof: {
        ...options.proof,
        signatureBase64: sign(
          "sha256",
          Buffer.from(options.proof.validatedString),
          key,
        ).toString("base64"),
      },
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* TestClock.setTime(options.proof.ts);
        expect(yield* verifier.verify(signed(oldPair.privateKey))).toEqual({
          valid: true,
        });
        unavailable = true;
        expect((yield* verifier.verify(signed(newPair.privateKey))).valid).toBe(
          false,
        );
        expect(get).toHaveBeenCalledTimes(2);
        currentPem = newPair.publicKey
          .export({ type: "spki", format: "pem" })
          .toString();
        unavailable = false;
        expect((yield* verifier.verify(signed(newPair.privateKey))).valid).toBe(
          false,
        );
        expect(get).toHaveBeenCalledTimes(2);
        yield* TestClock.adjust(60_000);
        expect(yield* verifier.verify(signed(newPair.privateKey))).toEqual({
          valid: true,
        });
        expect(get).toHaveBeenCalledTimes(3);
      }).pipe(Effect.provide(TestClock.layer())),
    );
  });
});
