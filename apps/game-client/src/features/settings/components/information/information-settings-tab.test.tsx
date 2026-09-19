import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const commitSha = "1234567890abcdef1234567890abcdef12345678";

const buildTimestamp = "2026-07-23T10:20:30.000Z";

describe("InformationSettingsTab", () => {
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
    expect(screen.getByText("Data builda (UTC)")).toBeInTheDocument();
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

  it("copies the commit sha to the clipboard", async () => {
    const user = userEvent.setup();

    const { InformationSettingsTab } =
      await import("./information-settings-tab");

    render(<InformationSettingsTab />);

    await user.click(screen.getByRole("button", { name: "Kopiuj Commit SHA" }));

    expect(await navigator.clipboard.readText()).toBe(commitSha);
  });
});
