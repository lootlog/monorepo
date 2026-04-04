import { afterEach, vi } from "vitest";

(globalThis as typeof globalThis & { jest: typeof vi }).jest = vi;

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
