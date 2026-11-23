import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it, onTestFinished, vi } from "vitest";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
import { Capability } from "@lootlog/schema/permissions";
import { createHeroSighting } from "@/test/hero-sighting-fixtures";
import { createTimerGuildFixture } from "@/test/timer-fixtures";
import { createTimerHttpFixture } from "@/test/timer-http-fixtures";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";
import {
  captureRuntimeMessages,
  setTestRuntimeGame,
} from "@/test/test-runtime-window";
import { AddHeroSightingForm } from "./add-hero-sighting-form";

const GUILD_IDS = ["guild-1", "guild-2"];

const getGuildId = (request: Request) =>
  /\/guilds\/([^/]+)\/hero-sightings$/u.exec(
    new URL(request.url).pathname,
  )?.[1];

const mountForm = (rejectingGuildId?: string) => {
  const fixture = createTimerHttpFixture((request) => {
    const guildId = getGuildId(request) ?? "";

    return guildId === rejectingGuildId
      ? Response.json(
          { code: "HERO_SIGHTING_LEVEL_NOT_VISIBLE" },
          { status: 403 },
        )
      : Response.json(createHeroSighting({ guildId, manual: true }));
  });

  setTestRuntimeGame();
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      createTimerGuildFixture(),
      createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
    ],
  );
  fixture.queryClient.setQueryData(
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId: "202",
    }),
    {
      "101": {
        userId: "user-1",
        accountId: "202",
        characterId: "101",
        catchingGuildIds: GUILD_IDS,
      },
    },
  );

  for (const guildId of GUILD_IDS)
    fixture.queryClient.setQueryData(
      getGuildsControllerGetGuildPermissionsQueryKey({ guildId }),
      [Capability.LOOTLOG_HERO_SIGHTINGS_WRITE],
    );

  const onClose = vi.fn();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <AddHeroSightingForm world="luvia" onClose={onClose} />
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    useHeroSightingsStore.getState().dismissOwnDetection();
    fixture.cleanup();
  });

  return { ...fixture, onClose };
};

const pasteAndSubmit = async (line: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Heros"));
  await user.paste(line);
  await user.click(screen.getByRole("button", { name: "Dodaj" }));
};

it("fills every field from a pasted detector line and adds the hero to each Lootlog of the character", async () => {
  const fixture = mountForm();

  await pasteAndSubmit(
    "[b]Tepeyollotl (258b)[/b] pojawi się w: Oztotl Tzacua p.2 - sala 2",
  );

  await waitFor(() => expect(fixture.onClose).toHaveBeenCalledOnce());
  expect(fixture.requests.map(getGuildId)).toEqual(GUILD_IDS);

  expect(await fixture.requests[0]?.json()).toMatchObject({
    world: "luvia",
    hero: { name: "Tepeyollotl", lvl: 258, prof: "b" },
    state: "SPAWNING",
    mapName: "Oztotl Tzacua p.2 - sala 2",
  });

  expect(
    useHeroSightingsStore
      .getState()
      .ownDetection?.sightings.map((sighting) => sighting.guildId),
  ).toEqual(GUILD_IDS);
});

it("keeps the form open, keeps the accepted Lootlog's sighting and names the hidden level when one Lootlog rejects it", async () => {
  const messages = captureRuntimeMessages();
  const fixture = mountForm("guild-2");

  await pasteAndSubmit("Tepeyollotl (258b) grasuje w: Oztotl Tzacua p.2");

  await waitFor(() =>
    expect(messages).toContain(
      "Twoje role nie widzą herosów na tym poziomie, więc nie możesz dodać herosa Tepeyollotl.",
    ),
  );
  expect(fixture.onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Mapa")).toHaveValue("Oztotl Tzacua p.2");
  expect(await fixture.requests[0]?.json()).toMatchObject({ state: "ROAMING" });
  expect(
    useHeroSightingsStore
      .getState()
      .ownDetection?.sightings.map((sighting) => sighting.guildId),
  ).toEqual(["guild-1"]);
});
