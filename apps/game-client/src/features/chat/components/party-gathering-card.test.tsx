import {
  act,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
} from "@lootlog/client/main";

import { setTestRuntimeGame } from "@/test/test-runtime-window";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { configureApiClients } from "@lootlog/client/transport";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { createChatReadyRoom } from "../chat-test-fixtures";
import { PartyGatheringCard } from "./party-gathering-card";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";

beforeEach(() => setTestRuntimeGame({ world: "tempest" }));

const fetchRequest = vi.fn<typeof fetch>();
let restoreApi: () => void;
const render = (ui: ReactElement) =>
  renderUi(ui, { wrapper: createChatTestWrapper().wrapper });
afterEach(() => restoreApi());

const member: MemberSummaryResponseDtoOutput = {
  id: 1,
  userId: "user-1",
  name: "Member",
};

const makeMessage = (
  overrides?: Partial<ChatMessageResponseDtoOutput>,
): ChatMessageResponseDtoOutput => ({
  id: "message-1",
  guildId: "guild-1",
  message: "Party up",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.PARTY_GATHERING,
  characterData: {
    nick: "Leader",
    id: 1,
    acc: 1,
    lvl: 200,
    prof: "w",
    icon: "leader.png",
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
  partyGathering: {
    notificationId: "notification-1",
    discordId: "discord-1",
    world: "tempest",
    description:
      "Very long party gathering description that should stay inside the card without causing horizontal overflow",
    minLvl: 180,
    maxLvl: 230,
  },

  canDelete: false,
  ...overrides,
});

describe("PartyGatheringCard", () => {
  beforeEach(() => {
    fetchRequest
      .mockReset()
      .mockResolvedValue(Response.json({ schemaVersion: 2 }));
    restoreApi = configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch: fetchRequest },
    });
    usePartyFinderStore.getState().clearReadyRooms();
    useWindowsStore.getState().setOpen("party-finder", false);
  });

  it("shows the organizer character tooltip", async () => {
    const user = userEvent.setup();
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    await user.hover(screen.getByText("Member:"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Leader (200w)",
    );
  });

  it("keeps the organizer tooltip and stops accepting signup after the gathering ends", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Dołącz do grupy" }),
    ).toBeEnabled();
    rerender(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage({ partyGathering: undefined })}
      />,
    );

    await user.hover(screen.getByText("Member:"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Leader (200w)",
    );
    expect(
      screen.queryByRole("button", { name: "Dołącz do grupy" }),
    ).toBeNull();
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("applies to the Ready Room from the explicit join click", async () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    expect(fetchRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dołącz do grupy" }));
    await waitFor(() => expect(fetchRequest).toHaveBeenCalledOnce());
    const [url, options] = fetchRequest.mock.calls[0] ?? [];
    expect(String(url)).toContain("notification-1");
    expect(options?.method).toBe("POST");
    expect(options?.body).toContain('"world":"tempest"');
    expect(options?.body).toContain('"accountId":"202"');
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Dołącz do grupy" }),
      ).toBeEnabled(),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
  });

  it("shows that the current character is already registered", () => {
    setTestRuntimeGame({
      world: "tempest",
      hero: { accountId: "999", characterId: "999" },
    });
    usePartyFinderStore.getState().mergeProjection(
      createChatReadyRoom({
        notificationId: "notification-1",
        participants: {
          participant: {
            participantId: "participant",
            discordId: "discord-1",
            character: {
              accountId: "999",
              characterId: "999",
              nick: "CurrentHero",
              lvl: 230,
              prof: "w",
              icon: "hero.gif",
            },
            partyPresence: "OUTSIDE",
            createdAt: "2026-07-21T10:00:00.000Z",
            updatedAt: "2026-07-21T10:00:00.000Z",
          },
        },
      }),
    );

    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Zapisano do grupy" }),
    ).toBeDisabled();
  });

  it("keeps a successful signup read-only while the participant status changes", async () => {
    const participant = {
      participantId: "participant",
      discordId: "current-user",
      character: {
        accountId: "202",
        characterId: "101",
        nick: "Tester",
        lvl: 230,
        prof: "w",
        icon: "hero.gif",
      },
      partyPresence: "OUTSIDE" as const,
      createdAt: "2026-07-21T10:00:00.000Z",
      updatedAt: "2026-07-21T10:00:00.000Z",
    };
    const projection = createChatReadyRoom({
      notificationId: "notification-1",
      world: "tempest",
      participants: { participant },
    });
    fetchRequest.mockResolvedValueOnce(Response.json(projection));
    const user = userEvent.setup();
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage()}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    const status = await screen.findByRole("button", {
      name: "Zapisano do grupy",
    });
    expect(status).toBeDisabled();
    await user.click(status);
    expect(
      usePartyFinderStore.getState().projections["notification-1"],
    ).toEqual(projection);
    expect(fetchRequest).toHaveBeenCalledOnce();

    act(() =>
      usePartyFinderStore.getState().mergeProjection({
        ...projection,
        revision: projection.revision + 1,
        participants: {
          participant: { ...participant, partyPresence: "IN_PARTY" },
        },
      }),
    );
    expect(
      await screen.findByRole("button", { name: "W grupie" }),
    ).toBeDisabled();
    expect(fetchRequest).toHaveBeenCalledOnce();
  });

  it("allows another character with the same nickname to apply", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage({
          characterData: {
            nick: "CurrentHero",
            id: 1,
            acc: 1,
            lvl: 200,
            prof: "w",
            icon: "leader.png",
          },
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Dołącz do grupy" }),
    ).toBeVisible();
  });
  it("blocks signup from another world or outside the level range", () => {
    setTestRuntimeGame({ world: "pandora" });
    const { rerender } = render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Inny świat" }));
    expect(fetchRequest).not.toHaveBeenCalled();
    setTestRuntimeGame({ world: "tempest", hero: { level: 100 } });
    rerender(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Wymagany poziom 180-230" }),
    ).toBeDisabled();
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("explains a blocked signup from the keyboard without submitting it", async () => {
    setTestRuntimeGame({ world: "pandora" });
    const user = userEvent.setup();
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage()}
      />,
    );

    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Inny świat");
    await user.keyboard("{Enter} ");
    expect(fetchRequest).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Inny świat" })).toBeDisabled();
  });

  it("shows a failed signup and clears the error on retry and room change", async () => {
    fetchRequest.mockRejectedValueOnce(new Error("offline"));
    const { rerender } = render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dołącz do grupy" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nie udało się dołączyć",
    );
    fireEvent.click(screen.getByRole("button", { name: "Dołącz do grupy" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchRequest).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Dołącz do grupy" }),
      ).toBeEnabled(),
    );
    fetchRequest.mockRejectedValueOnce(new Error("offline again"));
    fireEvent.click(screen.getByRole("button", { name: "Dołącz do grupy" }));
    await screen.findByRole("alert");
    rerender(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        message={makeMessage({ partyGathering: undefined })}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
