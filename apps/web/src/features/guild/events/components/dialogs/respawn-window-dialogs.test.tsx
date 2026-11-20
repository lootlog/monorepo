// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRespawnWindowDialog } from "./open-respawn-window-dialog";
import { CloseRespawnWindowDialog } from "./close-respawn-window-dialog";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("respawn window dialogs", () => {
  it("opens a fresh window using the time of opening after hours mounted", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-25T08:00:00Z"));
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const props = { heroName: "Heros", onOpenChange: vi.fn(), onConfirm };
    const view = render(<OpenRespawnWindowDialog {...props} open={false} />);

    vi.setSystemTime(new Date("2026-09-25T16:00:00Z"));
    view.rerender(<OpenRespawnWindowDialog {...props} open />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "events.respawn.openWindowButton" }),
      );
    });

    expect(onConfirm).toHaveBeenLastCalledWith({
      minSpawnTime: "2026-09-25T16:00:00.000Z",
      maxSpawnTime: "2026-09-25T19:00:00.000Z",
    });

    view.rerender(<OpenRespawnWindowDialog {...props} open={false} />);
    vi.setSystemTime(new Date("2026-09-26T16:00:00Z"));
    view.rerender(<OpenRespawnWindowDialog {...props} open />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "events.respawn.openWindowButton" }),
      );
    });
    expect(onConfirm).toHaveBeenLastCalledWith({
      minSpawnTime: "2026-09-26T16:00:00.000Z",
      maxSpawnTime: "2026-09-26T19:00:00.000Z",
    });
  });

  it("preserves failed close input for retry but does not reuse it for the next window", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);

    const props = { heroName: "Heros", onOpenChange: vi.fn(), onConfirm };
    const view = render(<CloseRespawnWindowDialog {...props} open />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("events.respawn.minSpawnTime"), {
      target: { value: "2026-09-25T15:00" },
    });
    fireEvent.change(screen.getByLabelText("events.respawn.maxSpawnTime"), {
      target: { value: "2026-09-25T18:00" },
    });

    const submit = () =>
      fireEvent.click(
        screen.getByRole("button", {
          name: "events.respawn.closeWindowButton",
        }),
      );

    await act(async () => {
      submit();
    });
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe(
      "true",
    );
    await act(async () => {
      submit();
    });
    expect(onConfirm).toHaveBeenNthCalledWith(2, {
      createNewWindow: true,
      newMinSpawnTime: new Date("2026-09-25T15:00").toISOString(),
      newMaxSpawnTime: new Date("2026-09-25T18:00").toISOString(),
    });

    view.rerender(<CloseRespawnWindowDialog {...props} open={false} />);
    view.rerender(<CloseRespawnWindowDialog {...props} open />);
    await act(async () => {
      submit();
    });
    expect(onConfirm).toHaveBeenLastCalledWith({ createNewWindow: false });
  });
});
