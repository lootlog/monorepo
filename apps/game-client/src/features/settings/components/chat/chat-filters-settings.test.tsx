import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { ChatFiltersSettings } from "./chat-filters-settings";

let harness: ReturnType<typeof createGuildPreferencesTest>;
const patchRequest = vi.fn<typeof fetch>();

const settingsDocuments: SettingsDocumentsResponseDtoOutput = {
  domains: {
    chat: {
      effective: { hiddenNpcTypes: ["TITAN"] },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
};

describe("ChatFiltersSettings", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.setPreferences({ userId: "user-1" });
    harness.queryClient.setQueryData(
      getSettingsDocumentsControllerGetPreferencesQueryKey({
        domains: "chat",
      }),
      settingsDocuments,
    );
    patchRequest
      .mockReset()
      .mockResolvedValue(Response.json(settingsDocuments));
    harness.request.mockImplementation(patchRequest);
  });

  it("renders translated copy, reflects hidden ranks and persists a toggle", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={harness.queryClient}>
        <ChatFiltersSettings />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Ukryte typy NPC" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/chatFilters\./)).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Tytan" })).toBeChecked();

    await user.click(screen.getByRole("switch", { name: "Elita 2" }));

    await waitFor(() => {
      expect(patchRequest.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          operations: [
            {
              domain: "chat",
              scope: { type: "USER", id: "user-1" },
              set: { hiddenNpcTypes: ["ELITE2", "TITAN"] },
              unset: [],
            },
          ],
        }),
      );
    });
  });
});
