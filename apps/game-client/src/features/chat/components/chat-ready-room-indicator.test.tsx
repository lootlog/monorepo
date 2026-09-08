import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createChatReadyRoom } from "../chat-test-fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { configureApiClients } from "@lootlog/client/transport";
import { ChatReadyRoomIndicator } from "./chat-ready-room-indicator";

beforeEach(() =>
  setTestRuntimeGame({
    hero: { accountId: "account-1", characterId: "101" },
  }),
);

const fetchRequest = vi.fn<typeof fetch>();
let restoreApi: () => void;
afterEach(() => {
  restoreApi();
  usePartyFinderStore.getState().clearReadyRooms();
});

const projection = createChatReadyRoom();

describe("ChatReadyRoomIndicator", () => {
  beforeEach(() => {
    fetchRequest.mockReset().mockResolvedValue(
      Response.json({
        schemaVersion: 3,
        type: "REMOVE",
        notificationId: "room-1",
        revision: 3,
      }),
    );
    restoreApi = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: fetchRequest,
      },
    });
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
  });

  it("shows the current registration and withdraws without opening another window", async () => {
    render(<ChatReadyRoomIndicator />);

    expect(screen.getByText("Zapisano do grupy: Leader")).toBeVisible();
    expect(screen.getByText("poza grupą")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Wycofaj zgłoszenie" }));

    await waitFor(() => {
      expect(fetchRequest).toHaveBeenCalledOnce();
      const [url, options] = fetchRequest.mock.calls[0] ?? [];
      expect(String(url)).toContain("room-1");
      expect(options?.body).toBe(
        JSON.stringify({ participantId: "participant-1" }),
      );
      expect(
        screen.queryByText("Zapisano do grupy: Leader"),
      ).not.toBeInTheDocument();
    });
  });
});
