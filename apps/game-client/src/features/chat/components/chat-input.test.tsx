import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@lootlog/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  NullableMemberResponseDto,
  RoleResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { MessageType } from "@/api/chat.api";
import { restoreChatEditorSelection } from "@/features/chat/chat-editor-selection.helpers";
import { ChatInput } from "./chat-input";

const mockSendChatMessage = vi.fn();
const mockStartNotificationMessage = vi.fn();
const mockHandlePartyCommand = vi.fn();
const mockClearReplyDraft = vi.fn();
const mockSetQueryData = vi.fn();
const mockScrollIntoView = vi.fn();
const mockClearChatMessages = vi.fn();

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

const createDomRect = ({
  height = 0,
  left = 0,
  top = 0,
  width = 0,
}: {
  height?: number;
  left?: number;
  top?: number;
  width?: number;
}) => {
  return {
    x: left,
    y: top,
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
};

const getEditorForRange = (range: Range) => {
  const container =
    range.endContainer.nodeType === Node.ELEMENT_NODE
      ? (range.endContainer as Element)
      : range.endContainer.parentElement;

  return container?.closest(
    "[data-slot='chat-input']",
  ) as HTMLDivElement | null;
};

const getRangeTextOffset = ({
  editor,
  range,
}: {
  editor: HTMLDivElement;
  range: Range;
}) => {
  const measurementRange = editor.ownerDocument.createRange();
  measurementRange.selectNodeContents(editor);
  measurementRange.setEnd(range.endContainer, range.endOffset);

  return measurementRange.toString().length;
};

const createDomRectList = (rect: DOMRect) => {
  return {
    0: rect,
    length: 1,
    item: (index: number) => {
      return index === 0 ? rect : null;
    },
    [Symbol.iterator]: function* iterator() {
      yield rect;
    },
  } as unknown as DOMRectList;
};

const setEditorScrollMetrics = ({
  clientWidth,
  editor,
  left = 0,
  scrollWidth,
}: {
  clientWidth: number;
  editor: HTMLDivElement;
  left?: number;
  scrollWidth: number;
}) => {
  let currentScrollLeft = 0;

  Object.defineProperty(editor, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(editor, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(editor, "scrollLeft", {
    configurable: true,
    get: () => currentScrollLeft,
    set: (value: number) => {
      currentScrollLeft = value;
    },
  });

  vi.spyOn(editor, "getBoundingClientRect").mockReturnValue(
    createDomRect({
      left,
      top: 0,
      width: clientWidth,
      height: 20,
    }),
  );
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

vi.mock("@/lib/api/generated/main/chat/chat", () => ({
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
}));

vi.mock("@/lib/api/generated/main/guilds/guilds", () => ({
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
}));

vi.mock("@/lib/api/generated/main/members/members", () => ({
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
}));

vi.mock("@/lib/api/generated/main/roles/roles", () => ({
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
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockImplementation(
      function mockRangeBoundingClientRect(this: Range) {
        const editor = getEditorForRange(this);

        if (!editor) {
          return createDomRect({});
        }

        const textOffset = getRangeTextOffset({
          editor,
          range: this,
        });
        const editorRect = editor.getBoundingClientRect();
        const characterWidth = 7;
        const caretLeft =
          editorRect.left + 4 + textOffset * characterWidth - editor.scrollLeft;

        return createDomRect({
          left: caretLeft,
          top: editorRect.top + 3,
          width: 1,
          height: 14,
        });
      },
    );
    vi.spyOn(Range.prototype, "getClientRects").mockImplementation(
      function mockRangeClientRects(this: Range) {
        return createDomRectList(this.getBoundingClientRect());
      },
    );
    mockSendChatMessage.mockReset();
    mockStartNotificationMessage.mockReset();
    mockHandlePartyCommand.mockReset();
    mockClearReplyDraft.mockReset();
    mockSetQueryData.mockReset();
    mockScrollIntoView.mockReset();
    mockClearChatMessages.mockReset();
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
    await user.type(editor, "@ra");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(listbox.closest("[data-ll-native-scroll-area]")).toHaveClass(
      "ll:scrollbar-thumb-gray-400/50",
      "ll:scrollbar-track-gray-600/60",
    );
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
    await user.type(editor, "@ra");

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
    await user.type(editor, "hej @ra");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(editor.textContent).toBe("hej @Raider ");
    expect(screen.getByText("@Raider")).toHaveStyle({ color: "#12ab34" });

    firstRender.unmount();

    render(<ChatInput selectedGuildId="guild-1" />);

    const resetEditor = getEditor();
    await user.type(resetEditor, "@ra");
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

    await user.type(resetEditor, "i");
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
    await user.type(editor, "@");

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
    await user.type(editor, "hello world");

    restoreChatEditorSelection({
      root: editor,
      start: 6,
      end: 11,
    });
    fireEvent.cut(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "world");
    expect(editor.textContent).toBe("hello ");
  });

  it("scrolls the single-line editor horizontally to keep the caret visible", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor() as HTMLDivElement;
    setEditorScrollMetrics({
      editor,
      clientWidth: 80,
      scrollWidth: 840,
    });

    await user.click(editor);
    await user.type(
      editor,
      "to-jest-bardzo-dluga-wiadomosc-ktora-ma-przesunac-kursor",
    );

    expect(editor.scrollLeft).toBeGreaterThan(0);

    restoreChatEditorSelection({
      root: editor,
      start: 0,
    });
    fireEvent(document, new Event("selectionchange"));

    expect(editor.scrollLeft).toBe(0);
  });

  it("shows the placeholder again after deleting the editor content to zero", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    expect(screen.getByText("Wiadomość...")).toBeInTheDocument();

    await user.type(editor, "abc");
    expect(screen.queryByText("Wiadomość...")).not.toBeInTheDocument();

    await user.keyboard("{Backspace}{Backspace}{Backspace}");

    expect(editor.textContent).toBe("");
    expect(screen.getByText("Wiadomość...")).toBeInTheDocument();
  });

  it("shows slash command suggestions and inserts the selected command", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.type(editor, "/g");

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
    await user.type(editor, "!abc");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the clear chat command only for admin or owner permissions", async () => {
    const user = userEvent.setup();
    mockGuildPermissions = [Permission.ADMIN];
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.type(editor, "/c");

    expect(screen.getByText("Wyczyść czat")).toBeInTheDocument();
  });

  it("does not show the clear chat command for regular members", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.type(editor, "/c");

    expect(screen.queryByText("Wyczyść czat")).not.toBeInTheDocument();
  });

  it("opens a confirmation popover for /clr and clears the guild chat after confirming", async () => {
    const user = userEvent.setup();
    mockGuildPermissions = [Permission.OWNER];
    mockClearChatMessages.mockResolvedValue({ success: true });
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.type(editor, "/clr");
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
    const windowKeyUpHandler = vi.fn();
    window.addEventListener("keydown", windowKeyDownHandler);
    window.addEventListener("keyup", windowKeyUpHandler);

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    fireEvent.keyDown(editor, { key: "w" });
    fireEvent.keyUp(editor, { key: "w" });

    expect(editor.textContent).toBe("w");
    expect(windowKeyDownHandler).not.toHaveBeenCalled();
    expect(windowKeyUpHandler).not.toHaveBeenCalled();

    window.removeEventListener("keydown", windowKeyDownHandler);
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
    await user.type(editor, "hello");
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
});
