import { generateKeyPairSync, sign } from "node:crypto";
import type { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { env } from "#src/config/env";
import type { MargonemAccountProofDto } from "../dto/join-gateway.dto.js";
import { MargonemAccountProofService } from "./margonem-account-proof.service.js";

const NOW_MS = 1_700_000_000_000;

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const { publicKey: wrongPublicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const publicKeyPem = publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const wrongPublicKeyPem = wrongPublicKey
  .export({ type: "spki", format: "pem" })
  .toString();

function createProof(
  overrides: Partial<MargonemAccountProofDto> = {},
): MargonemAccountProofDto {
  const userId = overrides.userId ?? "20";
  const characterId = overrides.characterId ?? "10";
  const clanId = overrides.clanId;
  const token =
    overrides.token ??
    createProofToken({
      accountId: userId,
      characterId,
      clanId,
    });
  const ts = overrides.ts ?? NOW_MS / 1000;
  const validatedString =
    overrides.validatedString ?? `${userId}+${token}+${ts}`;
  const signatureBase64 =
    overrides.signatureBase64 ??
    sign("sha256", Buffer.from(validatedString), privateKey).toString("base64");

  return {
    userId,
    characterId,
    clanId,
    token,
    ts,
    validatedString,
    signatureBase64,
  };
}

function createProofToken({
  socketId = "socket-1",
  accountId = "20",
  characterId = "10",
  clanId,
  nonce = "0123456789abcdef0123456789abcdef",
}: {
  socketId?: string;
  accountId?: string;
  characterId?: string;
  clanId?: number;
  nonce?: string;
} = {}) {
  const characterIdHex = BigInt(characterId).toString(16).padStart(16, "0");
  const clanIdHex =
    clanId === undefined
      ? "ffffffffffffffff"
      : BigInt(clanId).toString(16).padStart(16, "0");

  return `lootlog:${socketId}:${accountId}:02${characterIdHex}${clanIdHex}${nonce}`;
}

describe("MargonemAccountProofService", () => {
  const get = vi.fn();
  let service: MargonemAccountProofService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    vi.clearAllMocks();
    env.MARGONEM_SIGNING_KEY_URL =
      "https://staticinfo.margonem.pl/.well-known/signing-key.pem";
    get.mockReturnValue(of({ data: publicKeyPem }));
    service = new MargonemAccountProofService({
      get,
    } as unknown as HttpService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a fresh proof signed by Margonem for the current socket and account", async () => {
    await expect(
      service.verifyProof({
        proof: createProof(),
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: true });

    expect(get).toHaveBeenCalledWith(env.MARGONEM_SIGNING_KEY_URL, {
      responseType: "text",
      timeout: 10000,
    });
  });

  it("rejects missing proof before fetching the signing key", async () => {
    await expect(
      service.verifyProof({
        proof: undefined,
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: false, reason: "missing proof" });

    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    [
      "different socket",
      createProof(),
      { socketId: "socket-2", accountId: "20" },
      "proof token mismatch",
    ],
    [
      "different account",
      createProof(),
      { socketId: "socket-1", accountId: "21" },
      "proof account mismatch",
    ],
    [
      "different character",
      createProof(),
      { socketId: "socket-1", accountId: "20", characterId: "11" },
      "proof character mismatch",
    ],
    [
      "different clan",
      createProof({ clanId: 15191 }),
      {
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: 15192,
      },
      "proof clan mismatch",
    ],
    [
      "stale timestamp",
      createProof({ ts: (NOW_MS - 121_000) / 1000 }),
      { socketId: "socket-1", accountId: "20" },
      "stale proof timestamp",
    ],
    [
      "future timestamp",
      createProof({ ts: (NOW_MS + 31_000) / 1000 }),
      { socketId: "socket-1", accountId: "20" },
      "future proof timestamp",
    ],
  ])(
    "rejects proof for %s before fetching the signing key",
    async (_name, proof, input, reason) => {
      const verifyInput = {
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
        ...input,
      };

      await expect(
        service.verifyProof({
          proof,
          socketId: verifyInput.socketId,
          accountId: verifyInput.accountId,
          characterId: verifyInput.characterId,
          clanId: verifyInput.clanId,
        }),
      ).resolves.toEqual({ valid: false, reason });

      expect(get).not.toHaveBeenCalled();
    },
  );

  it("rejects signatures that do not match the validated string", async () => {
    await expect(
      service.verifyProof({
        proof: createProof({ signatureBase64: "invalid-signature" }),
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: false, reason: "invalid proof signature" });
  });

  it("re-fetches the public key once when cached verification fails", async () => {
    get.mockReturnValueOnce(of({ data: wrongPublicKeyPem }));
    get.mockReturnValueOnce(of({ data: publicKeyPem }));

    await expect(
      service.verifyProof({
        proof: createProof(),
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: true });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it("reuses the cached public key for later proofs", async () => {
    const proof = createProof();

    await expect(
      service.verifyProof({
        proof,
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: true });
    await expect(
      service.verifyProof({
        proof,
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: undefined,
      }),
    ).resolves.toEqual({ valid: true });

    expect(get).toHaveBeenCalledTimes(1);
  });
});
