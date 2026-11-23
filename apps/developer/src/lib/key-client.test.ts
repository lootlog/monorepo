import { describe, expect, it } from "bun:test";
import { ApiError } from "@lootlog/client/transport";
import { getKeyErrorMessage } from "./key-client";
import { portalText as t } from "./translations";

const failure = (
  status: number,
  data: { readonly code?: string; readonly message: string },
) =>
  new ApiError({
    data,
    message: "Request failed",
    method: "POST",
    status,
    url: "https://auth.test/auth/api-keys",
  });

describe("getKeyErrorMessage", () => {
  it("explains a 503 whose body names the reason only in its code", () => {
    expect(
      getKeyErrorMessage(
        failure(503, {
          code: "ORGANIZATION_SERVICE_UNAVAILABLE",
          message: "Service unavailable",
        }),
      ),
    ).toBe(t.organizationServiceUnavailable);
  });
});
