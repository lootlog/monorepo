import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcListItem } from "./npc-list-item";
import type * as LootlogTypesModule from "@lootlog/types";

const mockUseCurrentGameAccountDetectorSettings = vi.fn();
const mockUseSession = vi.fn();
const mockGetNpcTypeByWt = vi.fn();
const mockCreateNotificationMutate = vi.fn();
const mockCreateNotificationMutateAsync = vi.fn();
const mockSendChatMessageMutate = vi.fn();
const mockSendChatMessageMutateAsync = vi.fn();

vi.mock("@/hooks/use-current-game-account-detector-settings", () => ({
  useCurrentGameAccountDetectorSettings: () =>
    mockUseCurrentGameAccountDetectorSettings(),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/hooks/api/use-create-notification", () => ({
  useCreateNotification: () => ({
    mutate: (...args: unknown[]) => mockCreateNotificationMutate(...args),
    mutateAsync: (...args: unknown[]) =>
      mockCreateNotificationMutateAsync(...args),
    isPending: false,
  }),
}));

vi.mock("@/hooks/api/use-send-chat-message", () => ({
  MessageType: {
    NPC: "NPC",
    PARTY_GATHERING: "PARTY_GATHERING",
  },
  useSendChatMessage: () => ({
    mutate: (...args: unknown[]) => mockSendChatMessageMutate(...args),
    mutateAsync: (...args: unknown[]) =>
      mockSendChatMessageMutateAsync(...args),
  }),
}));

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule = await importOriginal<typeof LootlogTypesModule>();

  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      id: 101,
      account: 202,
      nick: "Tester",
      lvl: 230,
      prof: "w",
      img: "hero.gif",
      clan: { id: 1, name: "Clan" },
    },
    getWorldName: () => "pandora",
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/npc-tile", () => ({
  NpcTile: ({ npc }: { npc: GameNpcWithLocation }) => (
    <div data-testid="npc-tile">{npc.nick}</div>
  ),
}));

const createNpc = (
  overrides?: Partial<GameNpcWithLocation>,
): GameNpcWithLocation => ({
  id: 1,
  nick: "Hero npc",
  x: 10,
  y: 20,
  tpl: 100,
  icon: "npc.gif",
  prof: "m",
  wt: 80,
  lvl: 210,
  type: 3,
  location: "Ithan",
  notificationSent: false,
  ...overrides,
});

const NpcListItemHarness = ({
  npcId,
  detectionAnimationCycle = null,
}: {
  npcId: number;
  detectionAnimationCycle?: number | null;
}) => {
  const npc = useNpcDetectorStore((state) =>
    state.npcs.find((currentNpc) => currentNpc.id === npcId),
  );

  if (!npc) {
    return null;
  }

  return (
    <NpcListItem npc={npc} detectionAnimationCycle={detectionAnimationCycle} />
  );
};

describe("NpcListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    const settings = createDetectorSettings();
    settings.HERO.detect = true;
    settings.HERO.notifyWindow = true;
    settings.routingRules = [
      {
        id: "rule-1",
        minLevel: 200,
        maxLevel: 220,
        guildIds: ["guild-1", "guild-2"],
      },
    ];

    mockUseCurrentGameAccountDetectorSettings.mockReturnValue({ settings });
    mockUseSession.mockReturnValue({
      data: {
        user: {
          discordId: "discord-1",
        },
      },
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    useNpcDetectorStore.setState({
      npcs: [],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
    });
    usePartyFinderStore.setState({
      notificationId: null,
      npc: null,
      volunteers: [],
      partyGathering: null,
      chatMessageIds: {},
      inviteStates: {},
    });
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: false,
        state: {},
      },
      "party-finder": {
        ...state["party-finder"],
        open: false,
      },
    }));

    vi.stubGlobal("message", vi.fn());
  });

  it("opens detector settings when no routing rule matches the npc level", () => {
    const settings = createDetectorSettings();
    settings.HERO.detect = true;
    settings.HERO.notifyWindow = true;
    settings.routingRules = [];
    mockUseCurrentGameAccountDetectorSettings.mockReturnValue({ settings });

    useNpcDetectorStore.setState({
      npcs: [createNpc()],
    });

    render(<NpcListItemHarness npcId={1} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Otwórz ustawienia wykrywacza" }),
    );

    expect(useWindowsStore.getState().settings.open).toBe(true);
    expect(useWindowsStore.getState().settings.state).toEqual({
      activeTab: "npc-detector",
    });
  });

  it("sends a notification, stores the result and starts the cooldown", () => {
    vi.useFakeTimers();

    mockCreateNotificationMutate.mockImplementation(
      (
        _payload: unknown,
        options?: {
          onSuccess?: (response: { notificationId: string }) => void;
        },
      ) => {
        options?.onSuccess?.({ notificationId: "notification-1" });
      },
    );

    useNpcDetectorStore.setState({
      npcs: [createNpc()],
    });

    render(<NpcListItemHarness npcId={1} />);

    const [sendButton] = screen.getAllByRole("button");

    fireEvent.click(sendButton);

    expect(mockCreateNotificationMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        world: "pandora",
        guildIds: ["guild-1", "guild-2"],
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(mockSendChatMessageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        guildIds: ["guild-1", "guild-2"],
        type: "NPC",
      }),
    );
    expect(useNpcDetectorStore.getState().npcs[0]).toEqual(
      expect.objectContaining({
        notificationSent: true,
      }),
    );
    expect(usePartyFinderStore.getState().notificationId).toBe(
      "notification-1",
    );
    expect(usePartyFinderStore.getState().npc).toEqual(
      expect.objectContaining({
        id: 1,
        name: "Hero npc",
      }),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
    expect(screen.getByText("5")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(useNpcDetectorStore.getState().npcs[0].notificationSent).toBe(false);
  });

  it("creates a party gathering and stores only fulfilled chat message ids", async () => {
    mockCreateNotificationMutateAsync.mockResolvedValue({
      notificationId: "notification-2",
      guildIds: ["guild-1", "guild-2"],
    });
    mockSendChatMessageMutateAsync.mockResolvedValue([
      {
        status: "fulfilled",
        value: { messageId: "message-1" },
      },
      {
        status: "rejected",
        reason: new Error("failed"),
      },
    ]);

    useNpcDetectorStore.setState({
      npcs: [createNpc()],
    });

    render(<NpcListItemHarness npcId={1} />);

    const buttons = screen.getAllByRole("button");
    const gatherButton = buttons[1];

    fireEvent.click(gatherButton);

    await waitFor(() => {
      expect(mockCreateNotificationMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          isGatheringParty: true,
        }),
      );
    });

    expect(mockSendChatMessageMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PARTY_GATHERING",
        guildIds: ["guild-1", "guild-2"],
      }),
    );
    expect(usePartyFinderStore.getState().partyGathering).toEqual(
      expect.objectContaining({
        notificationId: "notification-2",
        guildIds: ["guild-1", "guild-2"],
      }),
    );
    expect(usePartyFinderStore.getState().chatMessageIds).toEqual({
      "guild-1": "message-1",
    });
    expect(useNpcDetectorStore.getState().npcs[0].notificationSent).toBe(true);
    expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
  });

  it("shows an error message and resets pending state when gathering the party fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockCreateNotificationMutateAsync.mockRejectedValue(
      new Error("notification failed"),
    );

    useNpcDetectorStore.setState({
      npcs: [createNpc()],
    });

    render(<NpcListItemHarness npcId={1} />);

    const buttons = screen.getAllByRole("button");
    const gatherButton = buttons[1];

    fireEvent.click(gatherButton);

    await waitFor(() => {
      expect(globalThis.message).toHaveBeenCalledWith(
        "Nie udało się rozpocząć zbierania grupy",
      );
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to gather party:",
      expect.any(Error),
    );
    expect(gatherButton).not.toBeDisabled();
  });

  it("shows the remove button only when there is more than one npc and removes the current npc", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc()],
    });

    const { rerender } = render(<NpcListItemHarness npcId={1} />);

    expect(
      screen.queryByRole("button", { name: "Usuń NPC z listy" }),
    ).not.toBeInTheDocument();

    useNpcDetectorStore.setState({
      npcs: [createNpc({ id: 1 }), createNpc({ id: 2, nick: "Second npc" })],
    });

    rerender(<NpcListItemHarness npcId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń NPC z listy" }));

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({ id: 2 }),
    ]);
  });

  it("clears the detection animation after the flash duration", () => {
    vi.useFakeTimers();

    useNpcDetectorStore.setState({
      npcs: [createNpc()],
      activeDetectionAnimations: { 1: 4 },
      latestDetectionAnimationCycle: 4,
    });

    render(<NpcListItemHarness npcId={1} detectionAnimationCycle={4} />);

    act(() => {
      vi.advanceTimersByTime(1_050);
    });

    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual(
      {},
    );
  });
});
