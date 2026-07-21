import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Chat } from "./chat";

const mocks = vi.hoisted(() => ({
  chatOpen: false,
  integratedMode: false,
  useAccessibleGuilds: vi.fn(() => ({ data: [] })),
  useChatGuildData: vi.fn(() => ({
    membersByGuildId: {},
    mentionContextsByGuildId: {},
    messagesByGuildId: {},
  })),
  useChatMessagesListener: vi.fn(),
}));

vi.mock("@/features/chat/hooks/use-chat-messages", () => ({
  useChatMessagesListener: (...arguments_: unknown[]) =>
    mocks.useChatMessagesListener(arguments_),
}));

vi.mock("@/features/chat/hooks/use-chat-guild-data", () => ({
  useChatGuildData: () => mocks.useChatGuildData(),
}));

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () =>
    mocks.useAccessibleGuilds(),
}));

vi.mock("@/hooks/use-local-storage", async () => {
  const { useState } = await import("react");

  return {
    useLocalStorage: (_key: string, initialValue: string) =>
      useState(initialValue),
  };
});

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: {
      chat: { open: boolean };
      setOpen: () => void;
    }) => unknown,
  ) =>
    selector({
      chat: { open: mocks.chatOpen },
      setOpen: vi.fn(),
    }),
}));

vi.mock("@/store/chat.store", () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isIntegratedMode: mocks.integratedMode,
      isChatInputEnabled: true,
      setChatInputEnabled: vi.fn(),
      toggleChatInputEnabled: vi.fn(),
      chatFilter: "all",
      setChatFilter: vi.fn(),
      filtersVisible: false,
      toggleFiltersVisible: vi.fn(),
      setReplyDraft: vi.fn(),
    }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { account: 1, id: 2, nick: "Hero" },
    interface: "si",
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Chat", () => {
  beforeEach(() => {
    mocks.chatOpen = false;
    mocks.integratedMode = false;
    mocks.useAccessibleGuilds.mockClear();
    mocks.useChatGuildData.mockClear();
    mocks.useChatMessagesListener.mockClear();
  });

  it("keeps socket ingress active without querying or rendering a closed chat", () => {
    const { container } = render(<Chat />);

    expect(mocks.useChatMessagesListener).toHaveBeenCalledOnce();
    expect(mocks.useChatMessagesListener).toHaveBeenCalledWith([
      expect.objectContaining({ prefetchMembers: false }),
    ]);
    expect(mocks.useAccessibleGuilds).not.toHaveBeenCalled();
    expect(mocks.useChatGuildData).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
