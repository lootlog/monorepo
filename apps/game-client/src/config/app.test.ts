import { describe, expect, it } from "vitest";
import {
  APP_ENVIRONMENT,
  BUILD_TIMESTAMP,
  COMMIT_SHA,
  GAME_CLIENT_PACKAGE_VERSION,
} from "./app";

describe("application build metadata", () => {
  it("exposes metadata injected by the build", () => {
    expect(GAME_CLIENT_PACKAGE_VERSION).toBe("1.0.1-test");
    expect(COMMIT_SHA).toBe("0123456789abcdef0123456789abcdef01234567");
    expect(APP_ENVIRONMENT).toBe("test");
    expect(BUILD_TIMESTAMP).toBe("2026-07-23T10:20:30.000Z");
  });
});
