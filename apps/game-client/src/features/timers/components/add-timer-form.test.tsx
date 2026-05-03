import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchTimersNpcResponseDtoOutput } from "@/lib/api/generated/main/model";

const mockMutate = vi.fn();
const mockSetOpen = vi.fn();
const mockSetSelectedGuildIdsForTimers = vi.fn();

let mockGuilds = [
  { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
  { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-1" },
];

let mockNpcResults: SearchTimersNpcResponseDtoOutput[] = [];
let mockSelectedGuildIdsForTimersByCharId: Record<string, string[]> = {
  "101": ["guild-2"],
};
let mockGuildIdByCharId: Record<string, string> = {
  "101": "guild-1",
};

vi.mock("@/hooks/api/use-create-manual-timer", () => ({
  useCreateManualTimer: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: { setOpen: typeof mockSetOpen }) => unknown,
  ) =>
    selector({
      setOpen: mockSetOpen,
    }),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: () => ({
    selectedGuildIdsForTimersByCharId: mockSelectedGuildIdsForTimersByCharId,
    setSelectedGuildIdsForTimers: mockSetSelectedGuildIdsForTimers,
    guildIdByCharId: mockGuildIdByCharId,
  }),
}));

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => [
    "guilds",
    "accessible",
  ],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: mockGuilds,
  }),
}));

vi.mock("@/lib/api/generated/main/timers/timers", () => ({
  getTimersControllerSearchNpcsWithTimerDataQueryKey: () => [
    "timers",
    "search",
  ],
  useTimersControllerSearchNpcsWithTimerData: () => ({
    data: mockNpcResults,
  }),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "pandora",
    hero: {
      id: 101,
    },
  },
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: string; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
    <input onChange={onChange} {...props} />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    children,
    checked,
    onChange,
    id,
  }: {
    children: string;
    checked?: boolean;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    id?: string;
  }) => (
    <label htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/guild-switcher", () => ({
  GuildSwitcher: ({
    value,
    onChange,
    disabled,
  }: {
    value?: string;
    onChange?: (guildId: string) => void;
    disabled?: boolean;
  }) => (
    <select
      aria-label="Serwer"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    >
      <option value="">--</option>
      {mockGuilds.map((guild) => (
        <option key={guild.id} value={guild.id}>
          {guild.name}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/ui/autocomplete-suggestions", () => ({
  AutocompleteSuggestions: ({
    items,
    isOpen,
    onSelect,
    renderItem,
    selectedIndex,
    showNoResults,
    noResultsMessage,
  }: {
    items: SearchTimersNpcResponseDtoOutput[];
    isOpen: boolean;
    onSelect: (item: SearchTimersNpcResponseDtoOutput) => void;
    renderItem: (
      item: SearchTimersNpcResponseDtoOutput,
      index: number,
      isSelected: boolean,
    ) => ReactNode;
    selectedIndex: number;
    showNoResults?: boolean;
    noResultsMessage?: string;
  }) => {
    if (!isOpen && !showNoResults) {
      return null;
    }

    return (
      <div>
        {showNoResults ? <p>{noResultsMessage}</p> : null}
        {isOpen
          ? items.map((item, index) => (
              <button
                type="button"
                key={item.npcId}
                onClick={() => onSelect(item)}
              >
                {renderItem(item, index, index === selectedIndex)}
              </button>
            ))
          : null}
      </div>
    );
  },
}));

import { AddTimerForm } from "./add-timer-form";

describe("AddTimerForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockSetOpen.mockReset();
    mockSetSelectedGuildIdsForTimers.mockReset();
    mockGuilds = [
      { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
      { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-1" },
    ];
    mockNpcResults = [];
    mockSelectedGuildIdsForTimersByCharId = {
      "101": ["guild-2"],
    };
    mockGuildIdByCharId = {
      "101": "guild-1",
    };
  });

  it("uses the saved guild, exposes a 50-char name limit, and submits duration payloads", async () => {
    const user = userEvent.setup();
    render(<AddTimerForm />);

    const guildSelect = screen.getByLabelText("Serwer");
    const nameInput = screen.getByLabelText("Nazwa");

    expect(guildSelect).toHaveValue("guild-2");
    expect(nameInput).toHaveAttribute("maxLength", "50");

    await user.selectOptions(guildSelect, "guild-1");
    expect(mockSetSelectedGuildIdsForTimers).not.toHaveBeenCalled();

    await user.type(nameInput, "Tanroth");
    await user.type(screen.getByLabelText("Minimalny czas (max 300h)"), "1m");
    await user.type(screen.getByLabelText("Maksymalny czas (max 300h)"), "2m");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        name: "Tanroth",
        world: "pandora",
        guildIds: ["guild-1"],
        minSeconds: 60,
        maxSeconds: 120,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    const callbacks = mockMutate.mock.calls[0]?.[1] as {
      onSuccess: () => void;
    };
    callbacks.onSuccess();

    expect(mockSetOpen).toHaveBeenCalledWith("add-timer", false);
  });

  it("uses the initial guild over the saved guild", async () => {
    render(<AddTimerForm initialGuildId="guild-1" />);

    expect(screen.getByLabelText("Serwer")).toHaveValue("guild-1");
    expect(mockSetSelectedGuildIdsForTimers).not.toHaveBeenCalled();
  });

  it("does not rewrite the saved guild when the initial guild already matches", async () => {
    mockSelectedGuildIdsForTimersByCharId = {
      "101": ["guild-1"],
    };

    render(<AddTimerForm initialGuildId="guild-1" />);

    expect(screen.getByLabelText("Serwer")).toHaveValue("guild-1");
    expect(mockSetSelectedGuildIdsForTimers).not.toHaveBeenCalled();
  });

  it("submits a manual level when provided", async () => {
    const user = userEvent.setup();
    render(<AddTimerForm />);

    await user.type(screen.getByLabelText("Nazwa"), "Tanroth");
    await user.type(screen.getByLabelText("Poziom"), "120");
    await user.type(screen.getByLabelText("Minimalny czas (max 300h)"), "1m");
    await user.type(screen.getByLabelText("Maksymalny czas (max 300h)"), "2m");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Tanroth",
        lvl: 120,
      }),
      expect.any(Object),
    );
  });

  it("supports autocomplete selection and custom spawn dates", async () => {
    const user = userEvent.setup();
    mockNpcResults = [
      {
        npcId: 500,
        timerKey: "npc-500",
        name: "Tanroth",
        lvl: 120,
        type: "hero" as never,
        prof: "W",
        location: "Ruins",
        wt: 10,
        icon: "icon.gif",
        latestRespBaseSeconds: 100,
        latestRespawnRandomness: 20,
      },
    ];

    render(<AddTimerForm />);

    const searchInput = screen.getByLabelText("Szukaj potwora");
    await user.type(searchInput, "ta");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByLabelText("Nazwa")).toHaveValue("Tanroth");
    expect(screen.getByLabelText("Minimalny czas (max 300h)")).toHaveValue(
      "0h 1m 20s",
    );
    expect(screen.getByLabelText("Maksymalny czas (max 300h)")).toHaveValue(
      "0h 2m 0s",
    );
    expect(screen.getByLabelText("Poziom")).toHaveValue(120);

    await user.click(screen.getByLabelText("Niestandardowe daty spawnu"));
    expect(screen.getByLabelText("Minimalny czas (max 300h)")).toHaveValue("");
    expect(screen.getByLabelText("Maksymalny czas (max 300h)")).toHaveValue("");

    await user.type(screen.getByLabelText("Data startu"), "2026-04-22T10:00");
    await user.type(screen.getByLabelText("Data końca"), "2026-04-22T10:15");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(mockMutate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Tanroth",
        guildIds: ["guild-2"],
        lvl: 120,
        prof: "W",
        customMinSpawnTime: new Date("2026-04-22T10:00"),
        customMaxSpawnTime: new Date("2026-04-22T10:15"),
      }),
      expect.any(Object),
    );
  });

  it("keeps visible level but does not submit hidden profession after changing the selected name manually", async () => {
    const user = userEvent.setup();
    mockNpcResults = [
      {
        npcId: 500,
        timerKey: "npc-500",
        name: "Tanroth",
        lvl: 120,
        type: "hero" as never,
        prof: "W",
        location: "Ruins",
        wt: 10,
        icon: "icon.gif",
        latestRespBaseSeconds: 100,
        latestRespawnRandomness: 20,
      },
    ];

    render(<AddTimerForm />);

    await user.type(screen.getByLabelText("Szukaj potwora"), "ta");
    await user.keyboard("{ArrowDown}{Enter}");

    const nameInput = screen.getByLabelText("Nazwa");
    await user.clear(nameInput);
    await user.type(nameInput, "Inny timer");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Inny timer",
        lvl: 120,
      }),
      expect.any(Object),
    );
    expect(mockMutate.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({
        prof: expect.any(String),
      }),
    );
  });

  it("does not submit level after clearing the autocomplete-prefilled level", async () => {
    const user = userEvent.setup();
    mockNpcResults = [
      {
        npcId: 500,
        timerKey: "npc-500",
        name: "Tanroth",
        lvl: 120,
        type: "hero" as never,
        prof: "W",
        location: "Ruins",
        wt: 10,
        icon: "icon.gif",
        latestRespBaseSeconds: 100,
        latestRespawnRandomness: 20,
      },
    ];

    render(<AddTimerForm />);

    await user.type(screen.getByLabelText("Szukaj potwora"), "ta");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.clear(screen.getByLabelText("Poziom"));
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(mockMutate.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({
        lvl: expect.any(Number),
      }),
    );
  });

  it("shows validation for malformed durations and displays the no-results state", async () => {
    const user = userEvent.setup();
    render(<AddTimerForm />);

    await user.type(screen.getByLabelText("Szukaj potwora"), "zz");
    expect(screen.getByText("Nie znaleziono potwora")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nazwa"), "Tanroth");
    await user.type(
      screen.getByLabelText("Minimalny czas (max 300h)"),
      "1h garbage",
    );
    await user.type(screen.getByLabelText("Maksymalny czas (max 300h)"), "1m");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    await waitFor(() => {
      expect(
        screen.getByText("Czas musi być większy niż 0 sekund"),
      ).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows validation for invalid levels", async () => {
    const user = userEvent.setup();
    render(<AddTimerForm />);

    await user.type(screen.getByLabelText("Nazwa"), "Tanroth");
    await user.type(screen.getByLabelText("Poziom"), "501");
    await user.type(screen.getByLabelText("Minimalny czas (max 300h)"), "1m");
    await user.type(screen.getByLabelText("Maksymalny czas (max 300h)"), "2m");
    await user.click(screen.getByRole("button", { name: "Dodaj" }));

    await waitFor(() => {
      expect(
        screen.getByText("Poziom musi być liczbą całkowitą od 1 do 500"),
      ).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
