type MeilisearchErrorCause = {
  cause?: {
    code?: unknown;
  };
};

export function getMeilisearchErrorCode(error: unknown): string | null {
  const code = (error as MeilisearchErrorCause | null)?.cause?.code;

  return typeof code === "string" ? code : null;
}
