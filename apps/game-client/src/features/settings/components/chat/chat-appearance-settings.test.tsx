import { QueryClientProvider } from "@tanstack/react-query";
import { getChatAppearanceFromDocuments } from "@/features/settings/persistence/use-appearance-settings";
import { getCurrentSettingsDocumentsQueryKey } from "@/features/settings/persistence/settings-patch-client";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
} from "@lootlog/schema/chat-appearance";
import { DEFAULT_NPC_TYPE_COLORS } from "@lootlog/schema/npc-appearance";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsDocumentsResponseDtoOutput } from "@lootlog/client/main";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { useSettingsStore } from "@/store/settings.store";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const patchRequest = vi.fn<typeof fetch>();

const settingsDocuments: SettingsDocumentsResponseDtoOutput = {
  domains: {
    appearance: {
      effective: {
        chat: CHAT_APPEARANCE_READABLE_PRESET,
        npcColors: DEFAULT_NPC_TYPE_COLORS,
      },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
};

import { ChatAppearanceSettingsForm } from "./chat-appearance-settings";

describe("ChatAppearanceSettingsForm", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    useSettingsStore.setState({ allowWorldSelection: false });
    harness.setPreferences({ userId: "user-1" });
    harness.queryClient.setQueryData(
      getCurrentSettingsDocumentsQueryKey(),
      settingsDocuments,
    );
    patchRequest
      .mockReset()
      .mockResolvedValue(Response.json(settingsDocuments));
    harness.request.mockImplementation(patchRequest);
  });

  it("shows the guild label option only when world selection is allowed", () => {
    const queryClient = harness.queryClient;

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("switch", { name: "Gildia" }),
    ).not.toBeInTheDocument();

    act(() => useSettingsStore.setState({ allowWorldSelection: true }));
    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("switch", { name: "Gildia" })).toBeInTheDocument();
  });

  it("applies a preset from the preset radio group and offers a custom option only for custom values", async () => {
    const user = userEvent.setup();
    const queryClient = harness.queryClient;

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("radio", { name: /^Czytelny/ })).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /^Własny/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /^Kompaktowy/ }));

    await waitFor(() => {
      expect(patchRequest.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          operations: [
            {
              domain: "appearance",
              scope: { type: "USER", id: "user-1" },
              set: { chat: CHAT_APPEARANCE_COMPACT_PRESET },
              unset: [],
            },
          ],
        }),
      );
    });
    expect(screen.getByRole("radio", { name: /^Kompaktowy/ })).toBeChecked();
  });

  it("offers the custom option only when the stored values match no preset", () => {
    const queryClient = harness.queryClient;
    queryClient.setQueryData(getCurrentSettingsDocumentsQueryKey(), {
      domains: {
        appearance: {
          ...settingsDocuments.domains.appearance,
          effective: {
            chat: { ...CHAT_APPEARANCE_READABLE_PRESET, fontScalePercent: 70 },
            npcColors: DEFAULT_NPC_TYPE_COLORS,
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("radio", { name: /^Własny/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Czytelny/ })).not.toBeChecked();
  });

  it("keeps slider changes local until the interaction is committed", async () => {
    const queryClient = harness.queryClient;
    patchRequest.mockResolvedValue(
      Response.json({
        domains: {
          appearance: {
            ...settingsDocuments.domains.appearance,
            effective: {
              chat: {
                ...CHAT_APPEARANCE_READABLE_PRESET,
                fontScalePercent: 70,
              },
            },
          },
        },
      }),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    const slider = screen.getByRole("slider", { name: "Skala tekstu" });
    const sliderControl = slider.parentElement?.parentElement;

    if (!sliderControl) throw new Error("Expected slider control");
    vi.spyOn(sliderControl, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 8),
    );
    sliderControl.setPointerCapture = vi.fn<HTMLElement["setPointerCapture"]>();
    sliderControl.hasPointerCapture = vi
      .fn<HTMLElement["hasPointerCapture"]>()
      .mockReturnValue(true);
    sliderControl.releasePointerCapture =
      vi.fn<HTMLElement["releasePointerCapture"]>();
    fireEvent.pointerDown(sliderControl, {
      button: 0,
      clientX: 0,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(
      getChatAppearanceFromDocuments(
        queryClient.getQueryData(getCurrentSettingsDocumentsQueryKey()),
      ).fontScalePercent,
    ).toBe(100);
    expect(patchRequest).not.toHaveBeenCalled();

    fireEvent.pointerUp(document, {
      button: 0,
      clientX: 0,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(
      getChatAppearanceFromDocuments(
        queryClient.getQueryData(getCurrentSettingsDocumentsQueryKey()),
      ).fontScalePercent,
    ).toBe(70);
    await waitFor(() => expect(patchRequest).toHaveBeenCalledOnce());
  });

  it("updates NPC location and coordinates with one control", async () => {
    const user = userEvent.setup();
    const queryClient = harness.queryClient;
    patchRequest.mockResolvedValue(Response.json(settingsDocuments));

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    await user.click(
      await screen.findByRole("switch", {
        name: "Lokacja i koordynaty NPC",
      }),
    );

    await waitFor(() => {
      expect(patchRequest.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          operations: [
            {
              domain: "appearance",
              scope: { type: "USER", id: "user-1" },
              set: {
                chat: {
                  showNpcLocationAndCoordinates: false,
                },
              },
              unset: [],
            },
          ],
        }),
      );
    });
    expect(screen.queryByText("Nazwa lokacji NPC")).not.toBeInTheDocument();
    expect(screen.queryByText("Koordynaty NPC")).not.toBeInTheDocument();
  });
});
