import { env } from "src/config/env";
import { Permission } from "src/generated/prisma/client";
import { RuntimeEnvironment } from "@lootlog/types";
import {
  isDevPermissionOverrideEnabled,
  parseDevPermissionOverrideHeader,
} from "./dev-permission-override";

const encodeOverride = (value: unknown) => {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
};

describe("dev permission override", () => {
  const originalEnv = env.ENV;
  const originalEnabled = env.DEV_PERMISSION_OVERRIDE_ENABLED;

  beforeEach(() => {
    env.ENV = RuntimeEnvironment.LOCAL;
    env.DEV_PERMISSION_OVERRIDE_ENABLED = false;
  });

  afterEach(() => {
    env.ENV = originalEnv;
    env.DEV_PERMISSION_OVERRIDE_ENABLED = originalEnabled;
  });

  it("stays disabled locally unless the feature flag is explicitly true", () => {
    expect(isDevPermissionOverrideEnabled()).toBe(false);
    expect(
      parseDevPermissionOverrideHeader(
        encodeOverride({
          enabled: true,
          permissions: [Permission.LOOTLOG_ACCESS],
        }),
      ),
    ).toBeUndefined();
  });

  it("enables override locally when the feature flag is true", () => {
    env.DEV_PERMISSION_OVERRIDE_ENABLED = true;

    expect(isDevPermissionOverrideEnabled()).toBe(true);
    expect(
      parseDevPermissionOverrideHeader(
        encodeOverride({
          enabled: true,
          permissions: [Permission.LOOTLOG_ACCESS],
        }),
      ),
    ).toMatchObject({
      enabled: true,
      permissions: [Permission.LOOTLOG_ACCESS],
    });
  });

  it.each([RuntimeEnvironment.STAGING, RuntimeEnvironment.PROD])(
    "keeps override disabled in %s even when the feature flag is true",
    (runtimeEnvironment) => {
      env.ENV = runtimeEnvironment;
      env.DEV_PERMISSION_OVERRIDE_ENABLED = true;

      expect(isDevPermissionOverrideEnabled()).toBe(false);
      expect(
        parseDevPermissionOverrideHeader(
          encodeOverride({
            enabled: true,
            permissions: [Permission.LOOTLOG_ACCESS],
          }),
        ),
      ).toBeUndefined();
    },
  );

  it("enables override in dev when the feature flag is true", () => {
    env.ENV = RuntimeEnvironment.DEV;
    env.DEV_PERMISSION_OVERRIDE_ENABLED = true;

    expect(isDevPermissionOverrideEnabled()).toBe(true);
    expect(
      parseDevPermissionOverrideHeader(
        encodeOverride({
          enabled: true,
          permissions: [Permission.LOOTLOG_ACCESS],
        }),
      ),
    ).toMatchObject({
      enabled: true,
      permissions: [Permission.LOOTLOG_ACCESS],
    });
  });
});
