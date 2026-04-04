import { randomUUID } from "node:crypto";
import { afterEach, vi } from "vitest";

vi.mock("uuid", () => ({
  v6: () => randomUUID(),
  v4: () => randomUUID(),
  v5: vi.fn(),
  v3: vi.fn(),
  v1: vi.fn(),
  validate: vi.fn(),
  version: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
