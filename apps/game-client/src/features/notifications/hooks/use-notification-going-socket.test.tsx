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

const player = (discordId: string, nick: string) => ({
  discordId,
  characterId: `${discordId}-character`,
  nick,
  lvl: 150,
  prof: "w",
  icon: "hero.gif",
});

const going = (
  reporterDiscordId: string,
  players: ReturnType<typeof player>[],
) => ({
  v: 1 as const,
  type: "notification.going" as const,
  data: {
    organizationId: "guild-1",
    payload: {
      guildId: "guild-1",
      world: "luvia",
      notificationId: "notification-1",
      reporterDiscordId,
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

  await test.receive(going("reporter", [player("a", "Szybka Strzała")]));
  await test.receive(
    going("reporter", [
      player("a", "Szybka Strzała"),
      player("b", "Lodowy Mag"),
    ]),
  );
  await test.receive(going("reporter", [player("b", "Lodowy Mag")]));

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

  await test.receive(going("reporter", [player("a", "Szybka Strzała")]));

  await waitFor(() =>
    expect(
      useNotificationGoingStore.getState().byNotification["notification-1"]
        ?.byGuild["guild-1"],
    ).toHaveLength(1),
  );
  expect(shown).toEqual([]);
});
