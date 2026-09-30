import {
  createSettingsDocuments,
  readSeededSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PingsSettingsTab } from "./pings-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<PingsSettingsTab />, { wrapper: harness.wrapper });

describe("PingsSettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ interface: "ni" });
    // The documents cache key follows the character, so seed after it.
    seedSettingsDocuments(harness.queryClient, createSettingsDocuments());
  });

  it("enables map and battle pings for an account that never chose", async () => {
    render();

    await waitFor(() => {
      expect(
        screen.getByRole("switch", { name: "Pingi na mapie" }),
      ).toBeChecked();
      expect(
        screen.getByRole("switch", { name: "Pingi w walce" }),
      ).toBeChecked();
    });
  });

  it("saves turning battle pings off on the account", async () => {
    const user = userEvent.setup();
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
    render();

    await user.click(screen.getByRole("switch", { name: "Pingi w walce" }));

    await waitFor(() => {
      const body = JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));
      expect(body.operations[0]).toMatchObject({
        domain: "gameData",
        set: { battlePings: { enabled: false } },
      });
    });
  });
});
