import { getUsersControllerGetUserGameAccountPreferencesQueryKey } from "@lootlog/client/main";
import { createGameAccountPreferences } from "@/test/game-account-preferences-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  act,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { Profiler } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { beforeEach, describe, expect, it } from "vitest";

import { NotificationsSettingsTab } from "./notifications-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;
beforeEach(() => {
  harness = createGuildPreferencesTest();
});
const render = () => {
  let commits = 0;
  return renderUi(
    <Profiler
      id="settings"
      onRender={() => {
        commits += 1;
        if (commits > 20)
          throw new Error(
            "Settings repeatedly reset their form without input changes",
          );
      }}
    >
      <NotificationsSettingsTab />
    </Profiler>,
    { wrapper: harness.wrapper },
  );
};

describe("NotificationsSettingsTab", () => {
  it("renders translated tab copy instead of raw settings keys", () => {
    render();

    expect(
      screen.getByRole("heading", { name: "Ustawienia powiadomień" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Skonfiguruj ustawienia powiadomień. Możesz dostosować, które typy NPC będą wywoływać powiadomienia oraz jak będą one prezentowane. Powiadomienia z chatu znajdziesz w zakładce Chat.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Komunikaty" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Grupa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("settings.notifications.title"),
    ).not.toBeInTheDocument();
  });
  it("applies refreshed account preferences without restarting the form reset loop", async () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const key = getUsersControllerGetUserGameAccountPreferencesQueryKey({
      accountId: "202",
    });
    const initial = createGameAccountPreferences("202");
    initial.notifications.ELITE2.show = true;
    harness.queryClient.setQueryData(key, initial);
    render();
    const control = document.getElementById("ELITE2-show");
    expect(control).toBeChecked();
    act(() =>
      harness.queryClient.setQueryData(key, {
        ...initial,
        notifications: {
          ...initial.notifications,
          ELITE2: { ...initial.notifications.ELITE2, show: false },
        },
      }),
    );
    await waitFor(() => expect(control).not.toBeChecked());
  });
});
