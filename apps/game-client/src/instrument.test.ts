import { afterEach, expect, it, vi } from "vitest";

const monitoringMocks = vi.hoisted(() => ({
  initializeErrorMonitoring: vi.fn(),
  triggerErrorMonitoringTest: vi.fn(() => true),
}));

vi.mock("@/lib/error-monitoring", () => monitoringMocks);

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

it("bridges the local Sentry trigger through the shared document", async () => {
  await import("./instrument");

  document.dispatchEvent(new Event("lootlog:sentry-test"));

  expect(monitoringMocks.initializeErrorMonitoring).toHaveBeenCalledTimes(1);
  expect(monitoringMocks.triggerErrorMonitoringTest).toHaveBeenCalledTimes(1);
});
