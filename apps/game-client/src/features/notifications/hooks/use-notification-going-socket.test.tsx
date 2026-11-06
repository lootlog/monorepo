import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useSession } from "@/hooks/auth/use-session";
import { useNotificationGoingStore } from "@/store/notification-going.store";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  renderRuntimeMessage,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { useNotificationGoingSocket } from "./use-notification-going-socket";

afterEach(() => {
  delete testRuntimeWindow.message;
  useNotificationGoingStore.setState({ byNotification: {} });
});

// The realtime test session signs in as User "user".
const REPORTER = "user";

const player = (userId: string, nick: string) => ({
  userId,
  characterId: `${userId}-character`,
  nick,
  lvl: 150,
  prof: "w",
  icon: "hero.gif",
});

const going = (
  reporterUserId: string,
  players: ReturnType<typeof player>[],
  guildId = "guild-1",
) => ({
  v: 1 as const,
  type: "notification.going" as const,
  data: {
    organizationId: guildId,
    payload: {
      guildId,
      world: "luvia",
      notificationId: "notification-1",
      reporterUserId,
      npcName: "Orla",
      npc: { type: "TITAN", lvl: 151 },
      going: players,
    },
  },
});

const render = async (discordId: string) => {
  const test = createRealtimeTest();
  const shown: string[] = [];

  testRuntimeWindow.message = (raw) => {
    shown.push(renderRuntimeMessage(raw).rendered.body.textContent ?? "");
  };

  act(() => test.setSessionDiscordId(discordId));

  const view = renderHook(
    () => {
      useNotificationGoingSocket();

      return useSession().data?.user.discordId;
    },
    { wrapper: test.wrapper },
  );

  await waitFor(() => expect(view.result.current).toBe(discordId));
  await test.join();

  return { test, shown };
};

it("tells the reporter who goes to their NPC and who takes it back", async () => {
  const { test, shown } = await render("reporter");

  await test.receive(going(REPORTER, [player("a", "Szybka Strzała")]));
  // Another of the reporter's Lootlogs lists the same answer.
  await test.receive(
    going(REPORTER, [player("a", "Szybka Strzała")], "guild-2"),
  );
  await test.receive(
    going(REPORTER, [player("a", "Szybka Strzała"), player("b", "Lodowy Mag")]),
  );
  await test.receive(going(REPORTER, [player("b", "Lodowy Mag")]));
  await test.receive(going(REPORTER, [], "guild-2"));

  await waitFor(() =>
    expect(shown).toEqual([
      "Szybka Strzała idzie na Orla",
      "Lodowy Mag idzie na Orla",
      "Szybka Strzała jednak nie idzie na Orla",
    ]),
  );
});

it("keeps other members' answers silent for everyone but the reporter", async () => {
  const { test, shown } = await render("member");

  await test.receive(going("other-user", [player("a", "Szybka Strzała")]));

  await waitFor(() =>
    expect(
      useNotificationGoingStore.getState().byNotification["notification-1"]
        ?.byGuild["guild-1"],
    ).toHaveLength(1),
  );
  expect(shown).toEqual([]);
});
