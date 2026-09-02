import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@lootlog/schema/permissions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  NullableMemberResponseDto,
  RoleResponseDtoOutput,
} from "@lootlog/client/main";
import { ApiError } from "@lootlog/client/transport";
import { MessageType } from "@/api/chat.api";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { toast } from "sonner";
import { ChatInput } from "./chat-input";

beforeEach(() => setTestRuntimeGame());

const mockSendChatMessage = vi.fn();
const mockStartNotificationMessage = vi.fn();
const mockHandlePartyCommand = vi.fn();
const mockClearReplyDraft = vi.fn();
const mockSetQueryData = vi.fn();
const mockScrollIntoView = vi.fn();
const mockClearChatMessages = vi.fn();

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

let mockGuildMembers: MemberSummaryResponseDtoOutput[] = [
  { id: 1, userId: "user-1", name: "Raider", color: 0x12ab34 },
  { id: 2, userId: "user-2", name: "Hero", color: null },
];
let mockGuildRoles: RoleResponseDtoOutput[] = [
  {
    id: "role-1",
    guildId: "guild-1",
    name: "Raid Team",
    color: 0xff8800,
    position: 1,
    permissions: [],
  },
];
let mockCurrentMember: NullableMemberResponseDto = {
  id: 2,
  userId: "user-2",
  guildId: "guild-1",
  type: "USER",
  name: "Hero",
  avatar: null,
  banner: null,
  active: true,
  roles: [
    {
      id: "role-1",
      guildId: "guild-1",
      name: "Raid Team",
      color: 0xff8800,
      position: 1,
      permissions: [],
    },
  ],
  globalUserId: null,
  lastDiscordSyncAt: null,
  isStale: false,
  staleWarning: "",
  refreshQueued: false,
  nextRefreshAt: null,
  updatedAt: "2026-01-01T10:00:00.000Z",
};
let mockGuildPermissions: Permission[] = [];

const setPlainEditorSelection = ({
  editor,
  end,
  start,
}: {
  editor: HTMLElement;
  end?: number;
  start: number;
}) => {
  const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
  const selection = document.getSelection();

  if (!(textNode instanceof Text) || !selection) {
    throw new Error("Expected a plain text Lexical node");
  }

  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end ?? start);
  selection.removeAllRanges();
  selection.addRange(range);
  fireEvent(document, new Event("selectionchange"));
};

const createSentMessageResponse = (): ChatMessageResponseDtoOutput => ({
  id: "message-sent-1",
  guildId: "guild-1",
  message: "hello",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NORMAL,
  characterData: {
    nick: "CurrentHero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  canEdit: false,
  canDelete: false,
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");

  return {
    ...actual,
    useQueryClient: () => ({
      getQueryState: () => ({ data: [], fetchStatus: "idle" }),
      setQueryData: mockSetQueryData,
    }),
  };
});

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getChatControllerGetChatMessagesQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => [guildId],
  useChatControllerClearChatMessages: () => ({
    mutateAsync: mockClearChatMessages,
    isPending: false,
  }),
  useChatControllerSendChatMessage: () => ({
    mutateAsync: mockSendChatMessage,
    isPending: false,
  }),
  getGuildsControllerGetGuildPermissionsQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["guild-permissions", guildId],
  useGuildsControllerGetGuildPermissions: (
    _: { guildId: string },
    options?: {
      query?: {
        enabled?: boolean;
      };
    },
  ) => ({
    data: options?.query?.enabled === false ? undefined : mockGuildPermissions,
  }),
  getMembersControllerGetMeQueryKey: ({ guildId }: { guildId: string }) => [
    "members",
    guildId,
    "me",
  ],
  getMembersControllerGetGuildMembersSummaryQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["members", guildId],
  getMembersControllerGetGuildMembersSummaryQueryOptions: (
    { guildId }: { guildId: string },
    options?: {
      query?: {
        enabled?: boolean;
        select?: (members: MemberSummaryResponseDtoOutput[]) => unknown;
      };
    },
  ) => ({
    queryKey: ["members", guildId],
    queryFn: () => Promise.resolve(mockGuildMembers),
    enabled: options?.query?.enabled ?? true,
    ...options?.query,
  }),
  useMembersControllerGetGuildMembersSummary: (
    _: { guildId: string },
    options?: {
      query?: {
        enabled?: boolean;
        select?: (members: MemberSummaryResponseDtoOutput[]) => unknown;
      };
    },
  ) => ({
    data:
      options?.query?.enabled === false
        ? undefined
        : (options?.query?.select?.(mockGuildMembers) ?? mockGuildMembers),
    isFetching: false,
  }),
  useMembersControllerGetMe: (
    _: { guildId: string },
    options?: {
      query?: {
        enabled?: boolean;
      };
    },
  ) => ({
    data: options?.query?.enabled === false ? undefined : mockCurrentMember,
    isFetching: false,
  }),
  getRolesControllerGetGuildRolesQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["roles", guildId],
  useRolesControllerGetGuildRoles: (
    _: { guildId: string },
    options?: {
      query?: {
        enabled?: boolean;
        select?: (roles: RoleResponseDtoOutput[]) => unknown;
      };
    },
  ) => ({
    data:
      options?.query?.enabled === false
        ? undefined
        : (options?.query?.select?.(mockGuildRoles) ?? mockGuildRoles),
    isFetching: false,
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => null,
    getWorldName: () => "tempest",
    hero: {
      id: 1,
      nick: "CurrentHero",
    },
  },
}));

vi.mock("@/features/command/hooks/use-party-command", () => ({
  usePartyCommand: () => ({
    handlePartyCommand: mockHandlePartyCommand,
  }),
}));

vi.mock("@/features/chat/hooks/use-notification-chat-orchestration", () => ({
  isNotificationRateLimitError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429,
  useNotificationChatOrchestration: () => ({
    isCreatingNotificationMessage: false,
    startNotificationMessage: mockStartNotificationMessage,
  }),
}));

vi.mock("@/store/chat.store", () => ({
  useChatStore: (
    selector: (state: {
      replyDraft: null;
      clearReplyDraft: typeof mockClearReplyDraft;
    }) => unknown,
  ) =>
    selector({
      replyDraft: null,
      clearReplyDraft: mockClearReplyDraft,
    }),
}));

describe("ChatInput", () => {
  const getEditor = () => {
    return screen.getByRole("textbox", { name: "Wiadomość..." });
  };

  const getEditorShell = () => {
    const editorShell = getEditor().parentElement?.parentElement;

    expect(editorShell).not.toBeNull();

    return editorShell as HTMLElement;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(
      mockScrollIntoView,
    );
    mockSendChatMessage.mockReset();
    mockStartNotificationMessage.mockReset();
    mockHandlePartyCommand.mockReset();
    mockClearReplyDraft.mockReset();
    mockSetQueryData.mockReset();
    mockScrollIntoView.mockReset();
    mockClearChatMessages.mockReset();
    vi.mocked(toast.error).mockReset();
    mockGuildMembers = [
      { id: 1, userId: "user-1", name: "Raider", color: 0x12ab34 },
      { id: 2, userId: "user-2", name: "Hero", color: null },
    ];
    mockGuildRoles = [
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Raid Team",
        color: 0xff8800,
        position: 1,
        permissions: [],
      },
    ];
    mockCurrentMember = {
      id: 2,
      userId: "user-2",
      guildId: "guild-1",
      type: "USER",
      name: "Hero",
      avatar: null,
      banner: null,
      active: true,
      roles: [
        {
          id: "role-1",
          guildId: "guild-1",
          name: "Raid Team",
          color: 0xff8800,
          position: 1,
          permissions: [],
        },
      ],
      globalUserId: null,
      lastDiscordSyncAt: null,
      isStale: false,
      staleWarning: "",
      refreshQueued: false,
      nextRefreshAt: null,
      updatedAt: "2026-01-01T10:00:00.000Z",
    };
    mockGuildPermissions = [];
  });

  it("uses the shared input focus ring on the editor shell", () => {
    render(<ChatInput selectedGuildId="guild-1" />);

    expect(getEditorShell()).toHaveClass(
      "ll:focus-within:border-ring",
      "ll:focus-within:ring-ring/50",
      "ll:focus-within:ring-[3px]",
    );
  });

  it("shows grouped suggestions inside the scroll area and inserts the highlighted mention instead of submitting", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@ra");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(
      listbox.closest("[data-ll-scroll-area-viewport]"),
    ).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Nicki")).toBeInTheDocument();

    expect(screen.getByText("@Raid Team")).toHaveStyle({ color: "#ff8800" });
    expect(screen.getByText("@Raider")).toHaveStyle({ color: "#12ab34" });

    await user.keyboard("{Enter}");

    expect(editor.textContent).toBe("@Raid Team ");
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it("completes and cycles mention suggestions with Tab", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@ra");

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raid Team ");
    expect(mockSendChatMessage).not.toHaveBeenCalled();

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raider ");

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raid Team ");
  });

  it("supports keyboard navigation, colored overlay for resolved mentions, and resets dismissed suggestions after the query changes", async () => {
    const user = userEvent.setup();
    const firstRender = render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hej @ra");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(editor.textContent).toBe("hej @Raider ");
    expect(screen.getByText("@Raider")).toHaveStyle({ color: "#12ab34" });

    firstRender.unmount();

    render(<ChatInput selectedGuildId="guild-1" />);

    const resetEditor = getEditor();
    await user.click(resetEditor);
    await user.paste("@ra");
    expect(
      screen.getByRole("option", { name: "@Raid Team" }),
    ).toBeInTheDocument();

    const scrollCallsBeforeArrowNavigation =
      mockScrollIntoView.mock.calls.length;
    await user.keyboard("{ArrowDown}");
    expect(mockScrollIntoView.mock.calls.length).toBeGreaterThan(
      scrollCallsBeforeArrowNavigation,
    );
    expect(mockScrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "nearest",
    });

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "@Raid Team" }),
      ).not.toBeInTheDocument();
    });

    await user.paste("i");
    expect(
      screen.getByRole("option", { name: "@Raid Team" }),
    ).toBeInTheDocument();
  });

  it("shows at most five roles and five members in the suggestions list", async () => {
    const user = userEvent.setup();
    mockGuildRoles = [
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Role Alpha",
        color: null,
        permissions: [],
      },
      {
        id: "role-2",
        guildId: "guild-1",
        name: "Role Beta",
        color: null,
        permissions: [],
      },
      {
        id: "role-3",
        guildId: "guild-1",
        name: "Role Gamma",
        color: null,
        permissions: [],
      },
      {
        id: "role-4",
        guildId: "guild-1",
        name: "Role Delta",
        color: null,
        permissions: [],
      },
      {
        id: "role-5",
        guildId: "guild-1",
        name: "Role Epsilon",
        color: null,
        permissions: [],
      },
      {
        id: "role-6",
        guildId: "guild-1",
        name: "Role Zeta",
        color: null,
        permissions: [],
      },
    ];
    mockGuildMembers = [
      { id: 1, userId: "user-1", name: "Member Alpha", color: null },
      { id: 2, userId: "user-2", name: "Member Beta", color: null },
      { id: 3, userId: "user-3", name: "Member Gamma", color: null },
      { id: 4, userId: "user-4", name: "Member Delta", color: null },
      { id: 5, userId: "user-5", name: "Member Epsilon", color: null },
      { id: 6, userId: "user-6", name: "Member Zeta", color: null },
    ];

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@");

    expect(screen.getAllByRole("option")).toHaveLength(10);
    expect(
      screen.queryByRole("option", { name: "@Role Zeta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "@Member Zeta" }),
    ).not.toBeInTheDocument();
  });

  it("sanitizes pasted multiline text into a single line with a preserved caret flow", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("linia 1\nlinia 2");

    expect(editor.textContent).toBe("linia 1 linia 2");
  });

  it("cuts selected text through controlled state instead of native contentEditable mutation", async () => {
    const user = userEvent.setup();
    const clipboardData = {
      setData: vi.fn(),
    };
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor() as HTMLDivElement;
    await user.click(editor);
    await user.paste("hello world");

    setPlainEditorSelection({
      editor,
      start: 6,
      end: 11,
    });
    fireEvent.cut(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "world");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("deletes the previous word with Ctrl+Backspace", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");
    await user.keyboard("{Control>}{Backspace}{/Control}");

    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("preserves a reverse selection when Shift+ArrowRight is pressed", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");

    const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
    const selection = document.getSelection();

    expect(textNode).toBeInstanceOf(Text);
    expect(selection).not.toBeNull();

    selection?.setBaseAndExtent(textNode as Text, 11, textNode as Text, 6);
    fireEvent(document, new Event("selectionchange"));
    fireEvent.keyDown(editor, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyUp(editor, { key: "ArrowRight", shiftKey: true });

    expect(selection?.isCollapsed).toBe(false);
    expect(selection?.anchorOffset).toBe(11);
    expect(selection?.focusOffset).toBe(6);
  });

  it("deletes reverse selections without collapsing them first", async () => {
    const user = userEvent.setup();
    const clipboardData = {
      setData: vi.fn(),
    };
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");

    const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
    const selection = document.getSelection();

    expect(textNode).toBeInstanceOf(Text);
    selection?.setBaseAndExtent(textNode as Text, 11, textNode as Text, 6);
    fireEvent(document, new Event("selectionchange"));
    fireEvent.cut(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "world");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("supports undo and redo through the native platform shortcuts", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");

    await user.keyboard("{Control>}z{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello");
    });
  });

  it("keeps resolved mentions atomic and serializes them as plain chat text", async () => {
    const user = userEvent.setup();
    mockSendChatMessage.mockResolvedValue(createSentMessageResponse());
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@Raider ");

    const mention = editor.querySelector("[data-chat-mention='raider']");

    expect(mention).toHaveTextContent("@Raider");
    expect(mention).toHaveStyle({ color: "#12ab34" });

    await user.keyboard("{Control>}{Backspace}{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });

    await user.paste("@ra");
    await user.keyboard("{Enter}{Enter}");
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    });
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: "@Raid Team ",
        }),
      }),
    );
  });

  it("limits pasted composer text to 120 characters", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("a".repeat(140));

    expect(editor.textContent).toBe("a".repeat(120));
  });

  it("does not submit while an IME composition is active", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("zażółć");
    fireEvent.compositionStart(editor);
    fireEvent.keyDown(editor, { key: "Enter", isComposing: true });
    fireEvent.compositionEnd(editor, { data: "ć" });

    expect(mockSendChatMessage).not.toHaveBeenCalled();
    expect(editor.textContent).toBe("zażółć");
  });

  it("keeps the single-line editor horizontally scrollable", () => {
    render(<ChatInput selectedGuildId="guild-1" />);

    expect(getEditor()).toHaveClass(
      "ll:overflow-x-auto",
      "ll:overflow-y-hidden",
      "ll:whitespace-pre",
    );
  });

  it("shows the placeholder again after deleting the editor content to zero", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    expect(screen.getByText("Wiadomość...")).toBeInTheDocument();

    await user.paste("abc");
    expect(screen.queryByText("Wiadomość...")).not.toBeInTheDocument();

    setPlainEditorSelection({
      editor,
      start: 0,
      end: 3,
    });
    fireEvent.cut(editor, {
      clipboardData: {
        setData: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });
    expect(screen.getByText("Wiadomość...")).toBeInTheDocument();
  });

  it("shows slash command suggestions and inserts the selected command", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/g");

    expect(screen.getByText("Szukaj grupy")).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "@Raid Team" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(editor.textContent).toBe("/grp ");
  });

  it("does not show command suggestions for bang notifications", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("!abc");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores repeated notification submits until orchestration finishes", async () => {
    const deferred = Promise.withResolvers<{
      result: ChatMessageResponseDtoOutput;
    }>();
    mockStartNotificationMessage.mockReturnValue(deferred.promise);
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");

    fireEvent.keyDown(editor, { key: "Enter" });
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(mockStartNotificationMessage).toHaveBeenCalledTimes(1);
    expect(editor).toHaveAttribute("tabindex", "-1");

    deferred.resolve({ result: createSentMessageResponse() });
    await waitFor(() => expect(editor).toHaveAttribute("tabindex", "0"));
    expect(editor.textContent).toBe("");
  });

  it("shows only the notification rate-limit error for a 429 response", async () => {
    mockStartNotificationMessage.mockRejectedValue(
      new ApiError({
        status: 429,
        data: { retryAfterMs: 1_000 },
        url: "/messaging",
        method: "POST",
        message: "Request failed",
      }),
    );
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Wysyłasz powiadomienia zbyt szybko. Spróbuj ponownie za chwilę.",
      ),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(editor.textContent).toBe("!alarm");
  });

  it("shows the clear chat command only for admin or owner permissions", async () => {
    const user = userEvent.setup();
    mockGuildPermissions = [Permission.ADMIN];
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/c");

    expect(screen.getByText("Wyczyść czat")).toBeInTheDocument();
  });

  it("does not show the clear chat command for regular members", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/c");

    expect(screen.queryByText("Wyczyść czat")).not.toBeInTheDocument();
  });

  it("opens a confirmation popover for /clr and clears the guild chat after confirming", async () => {
    const user = userEvent.setup();
    mockGuildPermissions = [Permission.OWNER];
    mockClearChatMessages.mockResolvedValue({ success: true });
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/clr");
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Wyczyścić czat?")).toBeInTheDocument();
    expect(mockSendChatMessage).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Wyczyść" }));

    await waitFor(() => {
      expect(mockClearChatMessages).toHaveBeenCalledWith({
        pathParams: { guildId: "guild-1" },
      });
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(["guild-1"], []);
    expect(editor.textContent).toBe("");
    expect(screen.queryByText("Wyczyścić czat?")).not.toBeInTheDocument();
  });

  it("stops keyboard events from bubbling outside the editor", async () => {
    const user = userEvent.setup();
    const windowKeyDownHandler = vi.fn();
    const windowKeyPressHandler = vi.fn();
    const windowKeyUpHandler = vi.fn();
    window.addEventListener("keydown", windowKeyDownHandler);
    window.addEventListener("keypress", windowKeyPressHandler);
    window.addEventListener("keyup", windowKeyUpHandler);

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("w");
    fireEvent.keyDown(editor, { key: "w" });
    fireEvent.keyPress(editor, { charCode: 119, key: "w" });
    fireEvent.keyUp(editor, { key: "w" });

    expect(editor.textContent).toBe("w");
    expect(windowKeyDownHandler).not.toHaveBeenCalled();
    expect(windowKeyPressHandler).not.toHaveBeenCalled();
    expect(windowKeyUpHandler).not.toHaveBeenCalled();

    window.removeEventListener("keydown", windowKeyDownHandler);
    window.removeEventListener("keypress", windowKeyPressHandler);
    window.removeEventListener("keyup", windowKeyUpHandler);
  });

  it("restores editor focus after sending a message", async () => {
    const user = userEvent.setup();
    const onMessageSent = vi.fn();
    mockSendChatMessage.mockResolvedValue(createSentMessageResponse());
    render(
      <ChatInput onMessageSent={onMessageSent} selectedGuildId="guild-1" />,
    );

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(editor).toHaveFocus();
    });
    expect(onMessageSent).toHaveBeenCalledTimes(1);
    expect(editor.textContent).toBe("");
  });

  it("preserves the draft and restores focus after a send error", async () => {
    const user = userEvent.setup();
    mockSendChatMessage.mockRejectedValue(new Error("send failed"));
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(editor).toHaveFocus();
    });
    expect(editor.textContent).toBe("hello");
  });
});
