import { describe, expect, it } from "vitest";
import { RuntimeEnvironment } from "@lootlog/types";
import { resolveActivityEventSignatureSecret } from "./create-env.js";

describe("resolveActivityEventSignatureSecret", () => {
  it("uses the same secret locally when only one service is configured", () => {
    const gatewaySecret = resolveActivityEventSignatureSecret(
      RuntimeEnvironment.LOCAL,
      "gateway-only-local-activity-secret",
    );
    const activitySecret = resolveActivityEventSignatureSecret(
      RuntimeEnvironment.LOCAL,
      undefined,
    );

    expect(gatewaySecret).toBe(activitySecret);
  });

  it("uses the configured secret in shared environments", () => {
    expect(
      resolveActivityEventSignatureSecret(
        RuntimeEnvironment.PROD,
        "shared-production-activity-secret",
      ),
    ).toBe("shared-production-activity-secret");
  });

  it("rejects a missing secret in shared environments", () => {
    expect(() =>
      resolveActivityEventSignatureSecret(
        RuntimeEnvironment.STAGING,
        undefined,
      ),
    ).toThrow("ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=staging");
  });
});
