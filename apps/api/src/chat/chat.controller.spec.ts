import { Permission } from "@lootlog/schema/permissions";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import { ChatController } from "./chat.controller.js";

describe("ChatController", () => {
  const mockChatService = {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
  };

  let controller: ChatController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ChatController(mockChatService as never);
  });

  it("declares permissions metadata for chat read and write endpoints", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ChatController.prototype.getChatMessages,
      ),
    ).toEqual([Permission.LOOTLOG_CHAT_READ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ChatController.prototype.sendChatMessage,
      ),
    ).toEqual([Permission.LOOTLOG_CHAT_WRITE]);
  });

  it("delegates chat mutations with guild and actor ids", () => {
    controller.sendChatMessage(
      { message: "hello" } as never,
      { id: "guild-1" } as never,
      "discord-1",
    );
    controller.updateChatMessage(
      { id: "guild-1" } as never,
      "discord-1",
      "message-1",
      { message: "updated" } as never,
    );
    controller.clearChatMessages({ id: "guild-1" } as never, "discord-1");
    controller.deleteChatMessage(
      { id: "guild-1" } as never,
      "discord-1",
      "message-1",
    );

    expect(mockChatService.sendMessage).toHaveBeenCalledWith(
      "discord-1",
      "guild-1",
      { message: "hello" },
    );
    expect(mockChatService.updateMessage).toHaveBeenCalledWith(
      "discord-1",
      "guild-1",
      "message-1",
      "updated",
    );
    expect(mockChatService.clearMessages).toHaveBeenCalledWith(
      "discord-1",
      "guild-1",
    );
    expect(mockChatService.deleteMessage).toHaveBeenCalledWith(
      "discord-1",
      "guild-1",
      "message-1",
    );
  });
});
