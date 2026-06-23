import { MARGONEM_ACCOUNT_VALIDATE_URL } from "@/config/api";

export type MargonemAccountProof = {
  userId: string;
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

type RequestMargonemAccountProofOptions = {
  socketId: string;
  accountId: string;
  fetchFn?: typeof fetch;
};

const NONCE_BYTES = 16;

export function createMargonemAccountProofToken({
  socketId,
  accountId,
  nonce = createNonce(),
}: {
  socketId: string;
  accountId: string;
  nonce?: string;
}): string {
  return `lootlog:${socketId}:${accountId}:${nonce}`;
}

export async function requestMargonemAccountProof({
  socketId,
  accountId,
  fetchFn = fetch,
}: RequestMargonemAccountProofOptions): Promise<MargonemAccountProof> {
  const token = createMargonemAccountProofToken({ socketId, accountId });
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

  return proof;
}

function parseMargonemAccountProofResponse(
  data: unknown,
): MargonemAccountProof {
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
