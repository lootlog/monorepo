// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerVisibilitySettings } from "./server-visibility-settings";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refetchGuilds: vi.fn(),
  refetchPreferences: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  useUsersControllerGetCurrentUserGuilds: () => ({
    data: [
      { id: "guild-1", name: "Alpha", icon: null },
      { id: "guild-2", name: "Beta", icon: null },
      { id: "guild-3", name: "Gamma", icon: null },
    ],
    isLoading: false,
    isError: false,
    refetch: mocks.refetchGuilds,
  }),
}));

vi.mock("@/hooks/api/user/use-user-preferences", () => ({
  useUserPreferences: () => ({
    data: {
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2", "temporarily-unavailable"],
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetchPreferences,
  }),
  useUpdateUserPreferences: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; name?: string }) => {
      const translations: Record<string, string> = {
        "settings.servers.title": "Widoczność serwerów",
        "settings.servers.description": "Opis",
        "settings.servers.searchPlaceholder": "Szukaj serwera",
        "settings.servers.filters.all": "Wszystkie",
        "settings.servers.filters.visible": "Widoczne",
        "settings.servers.filters.hidden": "Ukryte",
        "settings.servers.showAll": "Pokaż wszystkie",
        "settings.servers.hiddenInGameClient": "Ukryty w grze",
        "settings.servers.visibleInGameClient": "Widoczny w grze",
        "settings.servers.noResults": "Brak wyników",
      };

      if (key === "settings.servers.visibleCount") {
        return `${values?.count} widoczne`;
      }
      if (key === "settings.servers.hiddenCount") {
        return `${values?.count} ukryty`;
      }
      if (key === "settings.servers.switchLabel") {
        return `Pokaż ${values?.name} w grze`;
      }

      return translations[key] ?? key;
    },
  }),
}));

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: HTMLAttributes<HTMLDivElement>) => (
    <div>{children}</div>
  ),
}));

vi.mock("@lootlog/ui/components/card", () => ({
  Card: ({ children }: HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
}));

vi.mock("@lootlog/ui/components/button", () => ({
  Button: ({
    children,
    size: _size,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@lootlog/ui/components/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@lootlog/ui/components/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <button
      {...props}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    />
  ),
}));

vi.mock("@lootlog/ui/components/avatar", () => ({
  Avatar: ({ children }: HTMLAttributes<HTMLDivElement>) => (
    <div>{children}</div>
  ),
  AvatarImage: () => null,
  AvatarFallback: ({ children }: HTMLAttributes<HTMLDivElement>) => (
    <span>{children}</span>
  ),
}));

vi.mock("@lootlog/ui/components/spinner", () => ({
  Spinner: () => <span />,
}));

describe("ServerVisibilitySettings", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ordered guilds and visibility counts", () => {
    render(<ServerVisibilitySettings />);

    expect(screen.getByText("2 widoczne · 1 ukryty")).toBeTruthy();
    expect(
      screen
        .getAllByRole("switch")
        .map((control) => control.getAttribute("aria-label")),
    ).toEqual([
      "Pokaż Beta w grze",
      "Pokaż Alpha w grze",
      "Pokaż Gamma w grze",
    ]);
  });

  it("filters, saves snapshots and preserves unavailable hidden IDs", () => {
    render(<ServerVisibilitySettings />);

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj serwera"), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Pokaż Alpha w grze" }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      hiddenGuildIds: ["temporarily-unavailable"],
    });
  });
});
