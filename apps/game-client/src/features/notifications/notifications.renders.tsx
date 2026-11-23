import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { useNotificationsStore } from "@/store/notifications.store";
import { createNotificationTest } from "@/test/notification-test";
import { measureRenders, waitForQuietTree } from "@/test/render-scenario";
import { Notifications } from "./notifications";

const FULL_LIST = 50;

const npcReport = (index: number): ServerEvent => ({
  v: 1,
  type: "notification.sent",
  data: {
    organizationId: "guild-1",
    payload: {
      notificationId: `report-${index}`,
      guildId: "guild-1",
      discordId: "other-discord-id",
      world: "luvia",
      createdAt: "2026-04-22T10:00:00.000Z",
      npc: {
        id: 1_000 + index,
        name: `Heros ${index}`,
        lvl: 200,
        prof: "w",
        wt: 0,
        icon: "hero.gif",
        type: "COMMON",
        location: `Lokacja ${index}`,
      },
    },
  },
});

it("notifications window presents one report on a full list", async () => {
  const test = createNotificationTest();

  test.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );

  render(<Notifications />, { wrapper: test.wrapper });
  test.open();
  await test.receive(
    ...Array.from({ length: FULL_LIST }, (_, index) => npcReport(index)),
  );
  await screen.findByText(`Heros ${FULL_LIST - 1}`);
  await waitForQuietTree();

  await measureRenders("notifications-present", () =>
    test.receive(npcReport(FULL_LIST)),
  );

  expect(screen.getByText(`Heros ${FULL_LIST}`)).toBeInTheDocument();
  expect(useNotificationsStore.getState().notifications).toHaveLength(
    FULL_LIST,
  );
});
