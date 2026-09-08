import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, onTestFinished } from "vitest";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";
import { useWindowsStore } from "@/store/windows.store";
import { useChatStore } from "@/store/chat.store";
import { createRealtimeTest } from "@/test/realtime-test";
import { createChatMessage } from "./chat-test-fixtures";
import { Chat } from "./chat";

describe("Chat", () => {
  it("keeps socket ingress active without loading history or rendering a closed chat", async () => {
    const harness = createRealtimeTest();
    useWindowsStore.getState().setOpen("chat", false);
    useChatStore.setState({ isIntegratedMode: false });
    onTestFinished(() => {
      useChatStore.setState(useChatStore.getInitialState(), true);
    });
    const key = getChatControllerGetChatMessagesQueryKey({
      guildId: "guild-1",
    });
    harness.queryClient.setQueryData(key, []);
    const { container } = render(<Chat />, { wrapper: harness.wrapper });
    harness.open();
    const message = createChatMessage();
    await harness.receive({
      v: 1,
      type: "chat.created",
      data: { organizationId: "guild-1", payload: message },
    });
    await waitFor(() =>
      expect(harness.queryClient.getQueryData(key)).toEqual([message]),
    );
    expect(
      harness.requests.filter(
        (path) => !path.endsWith("/get-session") && path !== "/sound-settings",
      ),
    ).toEqual([]);
    expect(container).toBeEmptyDOMElement();
  });
});
