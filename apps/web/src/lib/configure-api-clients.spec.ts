// @vitest-environment happy-dom

import { ApiError, type ApiRequestContext } from "@lootlog/client/transport";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { handleWebApiError } from "./configure-api-clients";

const protectedRequest = {
  method: "GET",
  service: "main",
  url: "https://lootlog.test/auth/verify",
} satisfies ApiRequestContext;

const makeApiError = (
  status: number,
  data?: { readonly requiresReauth?: boolean },
) =>
  new ApiError({
    data,
    message: "request failed",
    method: "GET",
    status,
    url: protectedRequest.url,
  });

describe("web API authentication recovery", () => {
  afterEach(() => {
    useAuthRecoveryStore.getState().clearFailure();
  });

  it("records repeated protected 401 responses without starting OAuth", () => {
    handleWebApiError(makeApiError(401), protectedRequest);
    handleWebApiError(makeApiError(401), protectedRequest);
    handleWebApiError(makeApiError(401), protectedRequest);

    expect(useAuthRecoveryStore.getState().failure).toEqual({
      requiresReauth: false,
      status: 401,
    });
  });

  it("records an explicit requiresReauth response", () => {
    handleWebApiError(
      makeApiError(403, { requiresReauth: true }),
      protectedRequest,
    );

    expect(useAuthRecoveryStore.getState().failure).toEqual({
      requiresReauth: true,
      status: 403,
    });
  });

  it("ignores authentication errors from public endpoints", () => {
    handleWebApiError(makeApiError(401), {
      ...protectedRequest,
      url: "/public/battles/example",
    });

    expect(useAuthRecoveryStore.getState().failure).toBeNull();
  });
});
