import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it, onTestFinished, vi } from "vitest";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";
import { createAddTimerFixture } from "../add-timer-fixtures";
import { AddTimerForm } from "./add-timer-form";

const npc: SearchTimersNpcResponseDtoOutput = {
  npcId: 500,
  timerKey: "npc-500",
  name: "Tanroth",
  lvl: 120,
  type: "HERO",
  prof: "W",
  location: "Ruins",
  wt: 10,
  icon: "icon.gif",
  latestRespBaseSeconds: 100,
  latestRespawnRandomness: 20,
};

const mountForm = (
  guildId: string | undefined = "guild-1",
  npcResults: SearchTimersNpcResponseDtoOutput[] = [],
) => {
  const fixture = createAddTimerFixture({ npcResults });
  const onClose = vi.fn();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <AddTimerForm guildId={guildId} onClose={onClose} />
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return { ...fixture, onClose };
};

const fillDurations = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Nazwa"), "Tanroth");
  await user.type(screen.getByLabelText("Minimalny czas (maks. 300 h)"), "1m");
  await user.type(screen.getByLabelText("Maksymalny czas (maks. 300 h)"), "2m");
};

const submit = async (
  user: ReturnType<typeof userEvent.setup>,
  fixture: ReturnType<typeof createAddTimerFixture>,
) => {
  await user.click(screen.getByRole("button", { name: "Dodaj" }));
  await waitFor(() => expect(fixture.posts()).toHaveLength(1));
  const request = fixture.posts().at(0);

  if (!request) throw new Error("Expected the timer creation request");

  return request.json();
};

const selectNpc = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Szukaj potwora"), "ta");
  await screen.findByText("Tanroth");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(screen.getByLabelText("Nazwa")).toHaveValue("Tanroth");
};

it("submits durations to the window's guild and closes on success", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  expect(screen.getByLabelText("Nazwa")).toHaveAttribute("maxLength", "50");
  await fillDurations(user);
  expect(await submit(user, fixture)).toMatchObject({
    name: "Tanroth",
    world: "luvia",
    minSeconds: 60,
    maxSeconds: 120,
  });
  expect(fixture.posts()[0]?.url).toContain("/guilds/guild-1/timers/manual");
  await waitFor(() => expect(fixture.onClose).toHaveBeenCalledOnce());
});

it("closes without a request from the cancel button", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await user.click(screen.getByRole("button", { name: "Anuluj" }));
  expect(fixture.onClose).toHaveBeenCalledOnce();
  expect(fixture.posts()).toHaveLength(0);
});

it("disables submission when the window has no guild to add the timer to", () => {
  mountForm("");
  expect(screen.getByRole("button", { name: "Dodaj" })).toBeDisabled();
});

it('disables submission for the chat-only "all" scope', () => {
  mountForm("all");
  expect(screen.getByRole("button", { name: "Dodaj" })).toBeDisabled();
});

it("submits the optional level and NPC type chosen with the real select", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await fillDurations(user);
  await user.type(screen.getByLabelText("Poziom"), "120");
  await user.click(screen.getByRole("combobox", { name: "Typ" }));
  await user.click(screen.getByRole("option", { name: /tytan/i }));
  expect(await submit(user, fixture)).toMatchObject({
    lvl: 120,
    type: "TITAN",
  });
});

it("omits optional level, profession and NPC type when left empty", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await fillDurations(user);
  const payload = await submit(user, fixture);
  expect(payload).not.toHaveProperty("lvl");
  expect(payload).not.toHaveProperty("prof");
  expect(payload).not.toHaveProperty("type");
});

it("selects an autocomplete NPC and submits custom spawn dates", async () => {
  const user = userEvent.setup();
  const fixture = mountForm("guild-1", [npc]);
  await selectNpc(user);
  expect(screen.getByLabelText("Minimalny czas (maks. 300 h)")).toHaveValue(
    "0h 1m 20s",
  );
  expect(screen.getByLabelText("Maksymalny czas (maks. 300 h)")).toHaveValue(
    "0h 2m 0s",
  );
  expect(screen.getByLabelText("Poziom")).toHaveValue(120);
  await user.click(
    screen.getByRole("switch", { name: "Własne daty odrodzenia" }),
  );
  expect(screen.getByLabelText("Minimalny czas (maks. 300 h)")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Data startu"), {
    target: { value: "2026-04-22T10:00" },
  });
  fireEvent.change(screen.getByLabelText("Data końca"), {
    target: { value: "2026-04-22T10:15" },
  });
  expect(await submit(user, fixture)).toMatchObject({
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    type: "HERO",
    customMinSpawnTime: new Date("2026-04-22T10:00").toISOString(),
    customMaxSpawnTime: new Date("2026-04-22T10:15").toISOString(),
  });
});

it("retains the visible level but omits the hidden profession after changing the selected NPC's name", async () => {
  const user = userEvent.setup();
  const fixture = mountForm("guild-1", [npc]);
  await selectNpc(user);
  await user.clear(screen.getByLabelText("Nazwa"));
  await user.type(screen.getByLabelText("Nazwa"), "Inny timer");
  const payload = await submit(user, fixture);
  expect(payload).toMatchObject({ name: "Inny timer", lvl: 120, type: "HERO" });
  expect(payload).not.toHaveProperty("prof");
});

it("omits a cleared autocomplete level", async () => {
  const user = userEvent.setup();
  const fixture = mountForm("guild-1", [npc]);
  await selectNpc(user);
  await user.clear(screen.getByLabelText("Poziom"));
  expect(await submit(user, fixture)).not.toHaveProperty("lvl");
});

it("shows no search results and rejects malformed durations without an HTTP mutation", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await user.type(screen.getByLabelText("Szukaj potwora"), "zz");
  expect(await screen.findByText("Nie znaleziono potwora")).toBeVisible();
  await user.type(screen.getByLabelText("Nazwa"), "Tanroth");
  await user.type(
    screen.getByLabelText("Minimalny czas (maks. 300 h)"),
    "1h garbage",
  );
  await user.type(screen.getByLabelText("Maksymalny czas (maks. 300 h)"), "1m");
  await user.click(screen.getByRole("button", { name: "Dodaj" }));
  expect(
    await screen.findByText("Czas musi być większy niż 0 sekund"),
  ).toBeVisible();
  expect(fixture.posts()).toHaveLength(0);
});

it("reports a missing name together with the missing respawn times", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await user.click(screen.getByRole("button", { name: "Dodaj" }));
  expect(await screen.findByText("Nazwa jest wymagana")).toBeVisible();
  expect(
    screen.getByText("Podaj czasy respawnu lub niestandardowe daty"),
  ).toBeVisible();
  expect(fixture.posts()).toHaveLength(0);
});

it("rejects levels outside the supported range", async () => {
  const user = userEvent.setup();
  const fixture = mountForm();
  await fillDurations(user);
  await user.type(screen.getByLabelText("Poziom"), "501");
  await user.click(screen.getByRole("button", { name: "Dodaj" }));
  expect(
    await screen.findByText("Poziom musi być liczbą całkowitą od 1 do 500"),
  ).toBeVisible();
  expect(fixture.posts()).toHaveLength(0);
});
