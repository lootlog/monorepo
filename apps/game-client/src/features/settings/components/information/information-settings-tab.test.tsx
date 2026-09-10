import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Vite replaces these values at compilation, so stubEnv cannot exercise missing build metadata.
const { buildMetadata, buildTimestamp, commitSha } = vi.hoisted(() => ({
  buildMetadata: { commitSha: "1234567890abcdef1234567890abcdef12345678" },
  buildTimestamp: "2026-07-23T10:20:30.000Z",
  commitSha: "1234567890abcdef1234567890abcdef12345678",
}));

// eslint-disable-next-line anti-slop/no-module-mocking -- Vite hard-defines these build metadata literals before execution; stubEnv cannot vary the missing-SHA boundary.
vi.mock(import("@/config/app"), async (importOriginal) => ({
  ...(await importOriginal()),
  APP_ENVIRONMENT: "production",
  BUILD_TIMESTAMP: buildTimestamp,
  get COMMIT_SHA() {
    return buildMetadata.commitSha;
  },
  GAME_CLIENT_PACKAGE_VERSION: "1.0.1",
}));

import { InformationSettingsTab } from "./information-settings-tab";

describe("InformationSettingsTab", () => {
  beforeEach(() => {
    buildMetadata.commitSha = commitSha;
  });

  it("shows the current client build metadata", () => {
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

  it("shows a fallback when commit sha is unavailable", () => {
    buildMetadata.commitSha = "";

    render(<InformationSettingsTab />);

    expect(screen.getByText("Brak danych")).toBeInTheDocument();
  });
});
