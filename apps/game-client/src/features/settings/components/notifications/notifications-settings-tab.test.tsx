import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("./notification-category-form", () => ({
  NotificationCategoryForm: ({ categoryKey }: { categoryKey: string }) => (
    <div>{categoryKey}</div>
  ),
}));

import { NotificationsSettingsTab } from "./notifications-settings-tab";

describe("NotificationsSettingsTab", () => {
  it("renders translated tab copy instead of raw settings keys", () => {
    render(<NotificationsSettingsTab />);

    expect(
      screen.getByRole("heading", { name: "Ustawienia powiadomień" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Skonfiguruj ustawienia powiadomień. Możesz dostosować, które typy NPC będą wywoływać powiadomienia oraz jak będą one prezentowane.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Komunikaty" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupa" })).toBeInTheDocument();
    expect(
      screen.queryByText("settings.notifications.title"),
    ).not.toBeInTheDocument();
  });
});
