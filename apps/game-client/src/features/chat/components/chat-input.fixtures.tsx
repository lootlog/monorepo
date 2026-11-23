import { fireEvent, render as renderUi, screen } from "@testing-library/react";
import type { Capability } from "@lootlog/schema/permissions";
import { afterEach, beforeEach, vi } from "vitest";
import {
  type ChatMessageResponseDtoOutput,
  type MemberSummaryResponseDtoOutput,
  type NullableMemberResponseDto,
  type RoleResponseDtoOutput,
  getChatControllerGetChatMessagesQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
  getMembersControllerGetMeQueryKey,
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getRolesControllerGetGuildRolesQueryKey,
} from "@lootlog/client/main";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useChatStore } from "@/store/chat.store";
import { configureApiClients } from "@lootlog/client/transport";
import { MessageType } from "@/api/chat.api";
import {
  captureRuntimeMessages,
  setTestRuntimeGame,
} from "@/test/test-runtime-window";

export const sendRequest = vi.fn<typeof fetch>();

export const notificationRequest = vi.fn<typeof fetch>();

export const clearRequest = vi.fn<typeof fetch>();

export const mockScrollIntoView = vi.fn<HTMLElement["scrollIntoView"]>();

export const chatQueryKey = getChatControllerGetChatMessagesQueryKey({
  guildId: "guild-1",
});

const createRaidTeamRole = (): RoleResponseDtoOutput => ({
  id: "role-1",
  guildId: "guild-1",
  name: "Raid Team",
  color: 0xff8800,
  position: 1,
  permissions: [],
});

const createGuildMembers = (): MemberSummaryResponseDtoOutput[] => [
  { id: 1, userId: "user-1", name: "Raider", color: 0x12ab34 },
  { id: 2, userId: "user-2", name: "Hero", color: null },
];

const createCurrentMember = (): NullableMemberResponseDto => ({
  id: 2,
  userId: "user-2",
  guildId: "guild-1",
  type: "USER",
  name: "Hero",
  avatar: null,
  banner: null,
  active: true,
  roles: [createRaidTeamRole()],
  globalUserId: null,
  lastDiscordSyncAt: null,
  isStale: false,
  staleWarning: "",
  refreshQueued: false,
  nextRefreshAt: null,
  updatedAt: "2026-01-01T10:00:00.000Z",
});

type ChatInputFixture = {
  messages: string[];
  queryClient: QueryClient;
  guildMembers: MemberSummaryResponseDtoOutput[];
  guildRoles: RoleResponseDtoOutput[];
  currentMember: NullableMemberResponseDto;
  guildPermissions: Capability[];
};

export const chatInputFixture: ChatInputFixture = {
  messages: [],
  queryClient: new QueryClient(),
  guildMembers: createGuildMembers(),
  guildRoles: [createRaidTeamRole()],
  currentMember: createCurrentMember(),
  guildPermissions: [],
};

let restoreApi: () => void;

export const render = (ui: ReactElement) => {
  const guild = { guildId: "guild-1" };
  const { queryClient } = chatInputFixture;
  queryClient.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey(guild),
    chatInputFixture.guildPermissions,
  );
  queryClient.setQueryData(
    getMembersControllerGetMeQueryKey(guild),
    chatInputFixture.currentMember,
  );
  queryClient.setQueryData(
    getMembersControllerGetGuildMembersSummaryQueryKey(guild),
    chatInputFixture.guildMembers,
  );
  queryClient.setQueryData(
    getRolesControllerGetGuildRolesQueryKey(guild),
    chatInputFixture.guildRoles,
  );

  return renderUi(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

export const getEditor = () => {
  return screen.getByRole("textbox", { name: "Wiadomość…" });
};

export const setPlainEditorSelection = ({
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

export const createSentMessageResponse = (): ChatMessageResponseDtoOutput => ({
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

  canDelete: false,
});

beforeEach(() =>
  setTestRuntimeGame({ world: "tempest", hero: { name: "CurrentHero" } }),
);

beforeEach(() => {
  chatInputFixture.messages = captureRuntimeMessages();
});

afterEach(() => {
  restoreApi();
  chatInputFixture.queryClient.clear();
  useChatStore.setState(useChatStore.getInitialState(), true);
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(
    mockScrollIntoView,
  );
  sendRequest
    .mockReset()
    .mockResolvedValue(Response.json(createSentMessageResponse()));
  notificationRequest.mockReset();
  clearRequest.mockReset();
  chatInputFixture.queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  chatInputFixture.queryClient.setQueryData(chatQueryKey, []);
  useChatStore.setState(useChatStore.getInitialState(), true);
  restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );

        if (url.pathname.endsWith("/chat-messages")) {
          if (init?.method === "DELETE") return clearRequest(input, init);

          return sendRequest(input, init);
        }

        if (url.pathname.startsWith("/messaging"))
          return notificationRequest(input, init);
        throw new Error(`Unexpected HTTP request: ${url.pathname}`);
      },
    },
  });
  mockScrollIntoView.mockReset();
  chatInputFixture.guildMembers = createGuildMembers();
  chatInputFixture.guildRoles = [createRaidTeamRole()];
  chatInputFixture.currentMember = createCurrentMember();
  chatInputFixture.guildPermissions = [];
});
