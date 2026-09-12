import type { ReactElement } from "react";
import { getCurrentSettingsDocumentsQueryKey } from "@/features/settings/persistence/settings-patch-client";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import userEvent from "@testing-library/user-event";
import {
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
  SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";

import { ChatNpcMessage } from "./chat-npc-message";

const render = (ui: ReactElement) =>
  renderUi(ui, { wrapper: createChatTestWrapper().wrapper });

const makeChatMessage = (
  overrides?: Partial<ChatMessageType>,
): ChatMessageType => ({
  id: "message-1",
  guildId: "guild-1",
  message: "",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NPC,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  npc: {
    id: 10,
    name: "Hydra",
    icon: "npc.png",
    x: 7,
    y: 9,
    hpp: 100,
    location: "Swamp",
    lvl: 250,
    prof: "m",
    type: 1,
    wt: 100,
  },
  canDelete: false,
  ...overrides,
});

const member: GuildMember = {
  id: 1,
  userId: "user-1",
  name: "Member",
};

describe("ChatNpcMessage", () => {
  it("copies the NPC location through the context menu", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Kopiuj lokalizację" }),
    ).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Hydra"));
    await user.click(
      await screen.findByRole("menuitem", { name: "Kopiuj lokalizację" }),
    );
    expect(writeText).toHaveBeenCalledWith("Swamp (7, 9)");
  });

  it("hides the NPC rank of the clicked message through the context menu", async () => {
    const user = userEvent.setup();
    const harness = createGuildPreferencesTest();

    const settingsDocuments: SettingsDocumentsResponseDtoOutput = {
      domains: {
        chat: {
          effective: { hiddenNpcTypes: [] },
          layers: [],
          sources: {},
          schemaVersion: 1,
        },
      },
    };

    harness.queryClient.setQueryData(
      getCurrentSettingsDocumentsQueryKey(),
      settingsDocuments,
    );

    // A real server answers a patch with the patched document; the cache
    // holds that state optimistically, so echo it back.
    const patchRequest = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            harness.queryClient.getQueryData(
              getCurrentSettingsDocumentsQueryKey(),
            ),
          ),
        ),
      );

    harness.request.mockImplementation(patchRequest);
    renderUi(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage({
          npc: { ...makeChatMessage().npc!, wt: 100, prof: "w", type: 3 },
        })}
      />,
      { wrapper: harness.wrapper },
    );

    fireEvent.contextMenu(screen.getByText("Hydra"));
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Ukryj wiadomości: Tytan",
      }),
    );

    await waitFor(() =>
      expect(patchRequest.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          operations: [
            {
              domain: "chat",
              scope: { type: "USER", id: "user" },
              set: { hiddenNpcTypes: ["TITAN"] },
              unset: [],
            },
          ],
          context: {},
        }),
      ),
    );
  });

  it("hides the counter when there is only one grouped message", () => {
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.queryByText("x1")).not.toBeInTheDocument();
  });

  it("falls back to the character nick when member metadata is missing", () => {
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
      />,
    );

    expect(screen.getByText("Hero:")).toBeInTheDocument();
  });

  it("shows the sender character tooltip", async () => {
    const user = userEvent.setup();
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    await user.hover(screen.getByText("Member:"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Hero (100w)");
  });

  it("omits the location row when npc location is empty", () => {
    const npc = makeChatMessage().npc;

    if (!npc) throw new Error("Expected NPC fixture data");

    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage({
          npc: {
            ...npc,
            location: "   ",
            x: undefined,
            y: undefined,
          },
        })}
        member={member}
      />,
    );

    expect(screen.queryByText(/Swamp/)).not.toBeInTheDocument();
  });

  it("renders the inline variant and respects every metadata flag", () => {
    render(
      <ChatNpcMessage
        all
        appearance={{
          npcLayout: "inline",
          fontScalePercent: 70,
          messageGapPx: 0,
          showTimestamp: false,
          showGuildLabel: false,
          showNpcAvatar: false,
          showNpcLevel: false,
          showNpcLocationAndCoordinates: false,
        }}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.queryByText("[Guild]")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Hydra" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("(250m)")).not.toBeInTheDocument();
    expect(screen.queryByText("Swamp")).not.toBeInTheDocument();
    expect(screen.queryByText("(7, 9)")).not.toBeInTheDocument();
    expect(screen.queryByText("[10:00]")).not.toBeInTheDocument();
  });

  it("shows location and coordinates with one metadata flag", () => {
    render(
      <ChatNpcMessage
        all={false}
        appearance={{
          npcLayout: "inline",
          fontScalePercent: 100,
          messageGapPx: 4,
          showTimestamp: true,
          showGuildLabel: true,
          showNpcAvatar: true,
          showNpcLevel: true,
          showNpcLocationAndCoordinates: true,
        }}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.getByText("Swamp")).toBeInTheDocument();
    expect(screen.getByText("(7, 9)")).toBeInTheDocument();
  });
});
