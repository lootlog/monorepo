// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildsSelector } from "./guilds-selector";

type TestGuild = {
  id: string;
  name: string;
  icon: null;
};

const mocks = vi.hoisted(() => ({
  guildsQuery: {
    data: [] as TestGuild[] | undefined,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  preferencesQuery: {
    data: {
      guildsOrder: [] as string[],
      hiddenGuildIds: [] as string[],
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  useUsersControllerGetCurrentUserGuilds: () => mocks.guildsQuery,
}));

vi.mock("@/hooks/api/user/use-user-preferences", () => ({
  useUserPreferences: () => mocks.preferencesQuery,
  useUpdateUserPreferences: () => ({ mutate: mocks.mutate }),
}));

vi.mock("@/hooks/context/use-guild-id", () => ({
  useGuildId: () => undefined,
}));

vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({ lootUnreadCounts: {} }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@lootlog/ui/components/separator", () => ({
  Separator: (props: HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
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

vi.mock("@/components/layout/guild-nav-item", () => ({
  GuildNavItem: ({
    guild,
    onToggleHidden,
  }: {
    guild: TestGuild;
    onToggleHidden: () => void;
  }) => <button onClick={onToggleHidden}>{guild.name}</button>,
}));

vi.mock("@/components/layout/guild-nav-create", () => ({
  GuildNavCreate: () => null,
}));

vi.mock("@/components/layout/install-button", () => ({
  InstallButton: () => null,
}));

vi.mock("@/components/layout/user-nav-item", () => ({
  UserNavItem: () => null,
}));

vi.mock("@/components/layout/guilds-selector-skeleton", () => ({
  GuildsSelectorSkeleton: () => <span>loading</span>,
}));

vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({
      children,
      values,
      onReorder,
    }: {
      children: ReactNode;
      values: TestGuild[];
      onReorder: (guilds: TestGuild[]) => void;
    }) => (
      <div>
        <button
          aria-label="Reorder guilds"
          onClick={() => onReorder([...values].reverse())}
        />
        {children}
      </div>
    ),
    Item: ({
      children,
      onDragStart,
      onDragEnd,
      value,
    }: {
      children: ReactNode;
      onDragStart: () => void;
      onDragEnd: () => void;
      value: TestGuild;
    }) => (
      <div>
        <button
          aria-label={`Drag ${value.name}`}
          onPointerDown={onDragStart}
          onPointerUp={onDragEnd}
        />
        {children}
      </div>
    ),
  },
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("GuildsSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guildsQuery.data = [
      { id: "guild-1", name: "Alpha", icon: null },
      { id: "guild-2", name: "Beta", icon: null },
    ];
    mocks.guildsQuery.isError = false;
    mocks.guildsQuery.isLoading = false;
    mocks.preferencesQuery.data = {
      guildsOrder: [],
      hiddenGuildIds: [],
    };
    mocks.preferencesQuery.isError = false;
    mocks.preferencesQuery.isLoading = false;
    mocks.mutate.mockImplementation(
      (
        _payload: unknown,
        options?: {
          onSuccess?: () => void;
        },
      ) => options?.onSuccess?.(),
    );
  });

  afterEach(cleanup);

  it("keeps cached guilds visible after a background refetch error", () => {
    mocks.guildsQuery.isError = true;
    mocks.preferencesQuery.isError = true;

    render(<GuildsSelector />);

    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Beta" })).toBeTruthy();
  });

  it("does not retry a rejected guild order automatically", async () => {
    const { rerender } = render(<GuildsSelector />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Drag Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Reorder guilds" }));
    fireEvent.pointerUp(screen.getByRole("button", { name: "Drag Alpha" }));

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));

    mocks.preferencesQuery.data = {
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: [],
    };
    rerender(<GuildsSelector />);

    const mutationOptions = mocks.mutate.mock.calls[0]?.[1] as
      | { onSettled?: () => void }
      | undefined;
    act(() => mutationOptions?.onSettled?.());

    mocks.preferencesQuery.data = {
      guildsOrder: [],
      hiddenGuildIds: [],
    };
    rerender(<GuildsSelector />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it("undoes only the visibility change represented by the toast", () => {
    const { rerender } = render(<GuildsSelector />);

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    const toastOptions = mocks.toastSuccess.mock.calls[0]?.[1] as {
      action: { onClick: () => void };
    };
    mocks.preferencesQuery.data = {
      guildsOrder: [],
      hiddenGuildIds: ["guild-1", "guild-2"],
    };
    rerender(<GuildsSelector />);
    toastOptions.action.onClick();

    expect(mocks.mutate).toHaveBeenLastCalledWith({
      hiddenGuildIds: ["guild-2"],
    });
  });

  it("restores only the shown guild when undoing a show action", () => {
    mocks.preferencesQuery.data = {
      guildsOrder: [],
      hiddenGuildIds: ["guild-1"],
    };
    const { rerender } = render(<GuildsSelector />);

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    const toastOptions = mocks.toastSuccess.mock.calls[0]?.[1] as {
      action: { onClick: () => void };
    };
    mocks.preferencesQuery.data = {
      guildsOrder: [],
      hiddenGuildIds: ["guild-2"],
    };
    rerender(<GuildsSelector />);
    toastOptions.action.onClick();

    expect(mocks.mutate).toHaveBeenLastCalledWith({
      hiddenGuildIds: ["guild-2", "guild-1"],
    });
  });
});
