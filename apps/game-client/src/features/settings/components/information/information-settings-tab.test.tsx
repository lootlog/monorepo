import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const commitSha = "1234567890abcdef1234567890abcdef12345678";

const buildTimestamp = "2026-07-23T10:20:30.000Z";

// Each test re-imports the tab's whole module graph after resetModules, which
// can outlast the default timeout while the full suite loads the machine.
describe("InformationSettingsTab", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_COMMIT_SHA", commitSha);
    vi.stubEnv("VITE_BUILD_TIMESTAMP", buildTimestamp);
    vi.stubEnv("VITE_GAME_CLIENT_PACKAGE_VERSION", "1.0.1");
    vi.stubEnv("MODE", "production");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("shows the current client build metadata", async () => {
    const { InformationSettingsTab } =
      await import("./information-settings-tab");

    render(<InformationSettingsTab />);

    const formattedBuildTimestamp = new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(buildTimestamp));

    expect(screen.getByText("Wersja klienta")).toBeInTheDocument();
    expect(screen.getByText("1.0.1")).toBeInTheDocument();
    expect(screen.getByText("Commit SHA")).toBeInTheDocument();
    expect(screen.getByText(commitSha)).toBeInTheDocument();
    expect(screen.getByText("Środowisko")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("Data kompilacji (UTC)")).toBeInTheDocument();
    expect(screen.getByText(formattedBuildTimestamp)).toBeInTheDocument();
  });

  it("shows a fallback without a copy action when commit sha is unavailable", async () => {
    vi.stubEnv("VITE_COMMIT_SHA", "");

    const { InformationSettingsTab } =
      await import("./information-settings-tab");

    render(<InformationSettingsTab />);

    expect(screen.getByText("Brak danych")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Kopiuj Commit SHA" }),
    ).not.toBeInTheDocument();
  });

  it("copies one diagnostics bundle that keeps request secrets and identifiers out", async () => {
    const user = userEvent.setup();
    const { useLogsStore } = await import("@/store/logs.store");
    const logs = useLogsStore.getState();

    const actionId = logs.appendAction({
      actionType: "create_timer",
      payload: { note: "private-payload" },
    });

    logs.appendRequest({
      actionId,
      method: "POST",
      endpoint:
        "https://api.lootlog.test/guilds/1180473652345/timers/manual?token=secret-token",
      payload: { note: "private-payload" },
      response: { message: "private-response" },
      statusCode: 500,
      status: "error",
    });

    const { InformationSettingsTab } =
      await import("./information-settings-tab");

    render(<InformationSettingsTab />);

    await user.click(
      screen.getByRole("button", { name: "Kopiuj informacje diagnostyczne" }),
    );

    const report = await navigator.clipboard.readText();
    expect(report).toContain("version: 1.0.1");
    expect(report).toContain(`commit: ${commitSha}`);
    expect(report).toContain(
      "POST api.lootlog.test/guilds/:id/timers/manual -> 500",
    );
    expect(report).not.toContain("1180473652345");
    expect(report).not.toContain("secret-token");
    expect(report).not.toContain("private-payload");
    expect(report).not.toContain("private-response");
  });

  it("copies the commit sha to the clipboard", async () => {
    const user = userEvent.setup();

    const { InformationSettingsTab } =
      await import("./information-settings-tab");

    render(<InformationSettingsTab />);

    await user.click(screen.getByRole("button", { name: "Kopiuj Commit SHA" }));

    expect(await navigator.clipboard.readText()).toBe(commitSha);
  });
});
