import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import { useWindowsStore } from "@/store/windows.store";
import { battlePingStore } from "./battle-ping-store";
import { BattlePingWindow } from "./battle-ping-window";

const TITLE = "Pingi w walce";

const ping = (senderName: string) =>
  act(() => {
    battlePingStore.apply({
      forMe: false,
      senderName,
      type: "caution",
      warriorId: -5,
    });
  });

let test: ReturnType<typeof createRealtimeTest>;

beforeEach(() => {
  test = createRealtimeTest();
});

afterEach(() => {
  act(() => {
    battlePingStore.clear();
    useWindowsStore.getState().setOpen("battle-pings", false);
  });
});

it("opens with a fight's first ping, stays closed once closed, and opens again in the next fight", () => {
  render(<BattlePingWindow />, { wrapper: test.wrapper });
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

  ping("Borsuk");
  expect(screen.getByText(TITLE)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Zamknij okno" }));
  ping("Iskra");
  expect(useWindowsStore.getState()["battle-pings"].open).toBe(false);

  // The fight ends and the next one starts with a ping.
  act(() => battlePingStore.clear());
  ping("Borsuk");
  expect(useWindowsStore.getState()["battle-pings"].open).toBe(true);
});
