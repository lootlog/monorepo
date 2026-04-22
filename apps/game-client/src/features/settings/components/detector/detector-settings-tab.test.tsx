import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/settings/settings-section", () => ({
  SettingsSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock("@/components/settings/settings-sync-status", () => ({
  SettingsSyncStatus: () => <div>sync-status</div>,
}));

vi.mock("@/components/settings/settings-tab-layout", () => ({
  SettingsTabLayout: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock("@/hooks/use-game-account-preferences-sync-status", () => ({
  useGameAccountPreferencesSyncStatus: () => ({
    status: "idle" as const,
  }),
}));

vi.mock("./detector-routing-settings-tab-form", () => ({
  DetectorRoutingSettingsTabForm: () => <div>routing-form</div>,
}));

vi.mock("./detector-settings-tab-form", () => ({
  DetectorSettingsTabForm: ({ categoryKey }: { categoryKey: string }) => (
    <div>{categoryKey}</div>
  ),
}));

import { DetectorSettingsTab } from "./detector-settings-tab";

describe("DetectorSettingsTab", () => {
  it("renders translated tab copy instead of raw settings keys", () => {
    render(<DetectorSettingsTab />);

    expect(
      screen.getByRole("heading", { name: "Ustawienia wykrywacza" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Skonfiguruj wspólny routing komunikatów oraz lokalne wykrywanie NPC dla każdego typu.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Heros" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kolos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tytan" })).toBeInTheDocument();
    expect(
      screen.queryByText("settings.detector.title"),
    ).not.toBeInTheDocument();
  });
});
