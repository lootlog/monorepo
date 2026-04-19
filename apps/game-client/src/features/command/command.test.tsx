import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/store/chat.store";
import { useWindowsStore } from "@/store/windows.store";
import { CommandWindow } from "./command";

const mockSendChatMessage = vi.fn();
const mockCreateNotification = vi.fn();
const mockHandlePartyCommand = vi.fn();
const mockUseGuilds = vi.fn();

vi.mock("@/hooks/api/use-send-chat-message", () => ({
  MessageType: {
    NORMAL: "NORMAL",
    NOTIFICATION: "NOTIFICATION",
  },
  useSendChatMessage: () => ({
    mutate: mockSendChatMessage,
  }),
}));

vi.mock("@/hooks/api/use-create-notification", () => ({
  useCreateNotification: () => ({
    mutate: mockCreateNotification,
  }),
}));

vi.mock("@/features/command/hooks/use-party-command", () => ({
  usePartyCommand: () => ({
    handlePartyCommand: mockHandlePartyCommand,
  }),
}));

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => mockUseGuilds(),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      id: 123,
      nick: "Tester",
      account: 456,
      lvl: 210,
      prof: "m",
      img: "hero.gif",
    },
    getWorldName: () => "pandora",
  },
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (
    <div data-testid="animated-window" data-open={String(isOpen)}>
      {isOpen ? children : null}
    </div>
  ),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    title,
    onClose,
  }: {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
  }) => (
    <div data-testid="draggable-window">
      <div>{title}</div>
      <button type="button" onClick={onClose}>
        close
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/components/guild-multi-selector", () => ({
  GuildMultiSelector: () => <div data-testid="guild-multi-selector" />,
}));

vi.mock("./components/command-actions", () => ({
  CommandActions: () => null,
}));

describe("CommandWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGuilds.mockReturnValue({
      data: [
        { id: "guild-1", name: "Alpha", icon: null },
        { id: "guild-2", name: "Beta", icon: null },
      ],
    });

    useChatStore.setState((state) => ({
      ...state,
      selectedInputGuildIds: ["guild-1", "guild-2"],
    }));

    useWindowsStore.setState((state) => ({
      ...state,
      command: {
        ...state.command,
        open: true,
        autofocus: true,
      },
    }));
  });

  it("renders the compact command composer with recipients and normal mode", () => {
    render(<CommandWindow />);

    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("Konsola")).toBeInTheDocument();
    expect(screen.getByText("2 serwery")).toBeInTheDocument();
    expect(screen.getByText("Wiadomość")).toBeInTheDocument();
    expect(screen.getByText("Do: Alpha, Beta")).toBeInTheDocument();
  });

  it("submits a normal message without creating a notification", async () => {
    const user = userEvent.setup();
    render(<CommandWindow />);

    await user.type(screen.getByRole("textbox"), "hej gildio");
    await user.keyboard("{Enter}");

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockHandlePartyCommand).not.toHaveBeenCalled();
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        guildIds: ["guild-1", "guild-2"],
        message: "hej gildio",
        type: "NORMAL",
      }),
    );
    expect(useWindowsStore.getState().command.open).toBe(false);
  });

  it("submits a notification only after the ! command has content", async () => {
    const user = userEvent.setup();
    render(<CommandWindow />);

    const textbox = screen.getByRole("textbox");

    await user.type(textbox, "!");
    expect(
      screen.getByText("Dodaj treść powiadomienia po prefiksie !."),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockSendChatMessage).not.toHaveBeenCalled();

    await user.type(textbox, "alert");
    await user.keyboard("{Enter}");

    expect(mockCreateNotification).toHaveBeenCalledWith({
      guildIds: ["guild-1", "guild-2"],
      message: "alert",
      world: "pandora",
    });
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        guildIds: ["guild-1", "guild-2"],
        message: "alert",
        type: "NOTIFICATION",
      }),
    );
  });

  it("lets the user pick !grp from suggestions and submit a party command", async () => {
    const user = userEvent.setup();
    render(<CommandWindow />);

    const textbox = screen.getByRole("textbox");

    await user.type(textbox, "!g");
    expect(screen.getByText("Szukaj grupy")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(textbox).toHaveValue("!grp ");

    await user.type(textbox, "tank");
    await user.keyboard("{Enter}");

    expect(mockHandlePartyCommand).toHaveBeenCalledWith("tank", [
      "guild-1",
      "guild-2",
    ]);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
