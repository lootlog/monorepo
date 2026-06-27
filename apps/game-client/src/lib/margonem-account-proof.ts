import { MARGONEM_ACCOUNT_VALIDATE_URL } from "@/config/api";

export type MargonemAccountProof = {
  userId: string;
  characterId: string;
  clanId?: number;
  token: string;
  ts: number;
  validatedString: string;
  signatureBase64: string;
};

type MargonemAccountProofResponse = {
  user_id: string | number;
  token: string;
  ts: number;
  validatedString: string;
  signatureBase64: string;
};

type ParsedMargonemAccountProofResponse = Omit<
  MargonemAccountProof,
  "characterId" | "clanId"
>;

type RequestMargonemAccountProofOptions = {
  socketId: string;
  accountId: string;
  characterId: string;
  clanId?: number;
  fetchFn?: typeof fetch;
};

const NONCE_BYTES = 16;
const TOKEN_VERSION_PREFIX = "02";
const NO_CLAN_HEX = "ffffffffffffffff";
const MAX_UINT64 = 0xffffffffffffffffn;

export function createMargonemAccountProofToken({
  socketId,
  accountId,
  characterId,
  clanId,
  nonce = createNonce(),
}: {
  socketId: string;
  accountId: string;
  characterId: string;
  clanId?: number;
  nonce?: string;
}): string {
  const encodedCharacterId = encodeUnsignedInt64Hex(characterId);
  const encodedClanId =
    clanId === undefined ? NO_CLAN_HEX : encodeUnsignedInt64Hex(clanId);

  return `lootlog:${socketId}:${accountId}:${TOKEN_VERSION_PREFIX}${encodedCharacterId}${encodedClanId}${nonce}`;
}

export async function requestMargonemAccountProof({
  socketId,
  accountId,
  characterId,
  clanId,
  fetchFn = fetch,
}: RequestMargonemAccountProofOptions): Promise<MargonemAccountProof> {
  const token = createMargonemAccountProofToken({
    socketId,
    accountId,
    characterId,
    clanId,
  });
  const response = await fetchFn(MARGONEM_ACCOUNT_VALIDATE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok) {
    throw new Error("Margonem account proof request failed");
  }

  const data: unknown = await response.json();
  const proof = parseMargonemAccountProofResponse(data);

  if (proof.token !== token || proof.userId !== accountId) {
    throw new Error("Margonem account proof does not match current account");
  }

  return {
    ...proof,
    characterId,
    clanId,
  };
}

function parseMargonemAccountProofResponse(
  data: unknown,
): ParsedMargonemAccountProofResponse {
  if (!isMargonemAccountProofResponse(data)) {
    throw new Error("Invalid Margonem account proof response");
  }

  return {
    userId: String(data.user_id),
    token: data.token,
    ts: data.ts,
    validatedString: data.validatedString,
    signatureBase64: data.signatureBase64,
  };
}

function isMargonemAccountProofResponse(
  value: unknown,
): value is MargonemAccountProofResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    (typeof data.user_id === "string" || typeof data.user_id === "number") &&
    typeof data.token === "string" &&
    typeof data.ts === "number" &&
    typeof data.validatedString === "string" &&
    typeof data.signatureBase64 === "string"
  );
}

function createNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

const MAX_UINT64 = 0xffffffffffffffffn;

function encodeUnsignedInt64Hex(value: string | number): string {
  const numericValue = BigInt(value);

  if (numericValue < 0n || numericValue > MAX_UINT64) {
    throw new Error("Margonem account proof identifier is out of range");
  }

  return numericValue.toString(16).padStart(16, "0");
}
