export type ErrorType<TError> = Error & {
  body?: TError;
  status?: number;
};

export type BodyType<TBody> = TBody;

export type OrvalFetchOptions = RequestInit & {
  baseUrl?: string;
};

function buildRequestUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

export async function orvalFetchSearch<TData>(
  path: string,
  requestInit: OrvalFetchOptions = {},
): Promise<TData> {
  const { baseUrl, ...fetchInit } = requestInit;

  if (!baseUrl) {
    throw new Error("Search API baseUrl must be provided.");
  }

  const response = await fetch(buildRequestUrl(baseUrl, path), {
    ...fetchInit,
    credentials: fetchInit.credentials ?? "include",
  });

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const error: ErrorType<unknown> = new Error(
      `Search request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.body = body;

    throw error;
  }

  return (await response.json()) as TData;
}
