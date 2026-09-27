import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { NotificationMutes } from "@lootlog/schema/user-preferences";
import type { NotificationSettings } from "@lootlog/schema/account-preferences";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredNotification } from "@/store/notifications.store";
import { SingleNotification } from "./single-notification";

const notification: StoredNotification = {
  createdAt: "2026-07-20T05:00:00.000Z",
  discordId: "discord-1",
  guildId: "guild-1",
  listKey: "notification-1",
  reportIds: ["notification-1"],
  message: "hello",
  notificationId: "notification-1",
  receivedAtMs: 1,
  servers: ["guild-1"],
  type: "chat-mention",
  world: "world",
};

const categorySettings: NotificationSettings = {
  autoHideTimeout: 30,
  highlight: true,
  ignoreOtherWorlds: false,
  show: true,
  sound: false,
};

const mutes: NotificationMutes = { npcs: [], players: [] };

const noop = () => undefined;

const animationCancel = vi.fn<() => void>();

type TestAnimation = { cancel: () => void; onfinish: null };

const animate = vi.fn<
  (frames: Keyframe[], options: KeyframeAnimationOptions) => TestAnimation
>(() => ({
  cancel: animationCancel,
  onfinish: null,
}));

const renderNotification = (
  props?: Partial<
    Pick<
      ComponentProps<typeof SingleNotification>,
      "autoHideState" | "notification" | "onPauseAutoHide" | "onResumeAutoHide"
    >
  >,
) =>
  render(
    <SingleNotification
      animationEffectsEnabled
      autoHideState={{
        deadlineMs: Date.now() + 15_000,
        durationMs: 30_000,
        pausedRemainingMs: null,
      }}
      categorySettings={categorySettings}
      guildNamesById={{ "guild-1": "Guild" }}
      isJoiningReadyRoom={false}
      isMutesReady
      isMutePending={false}
      mutes={mutes}
      notification={notification}
      onJoinReadyRoom={noop}
      onPauseAutoHide={noop}
      onRemoveNotification={noop}
      onResumeAutoHide={noop}
      onUpdateMutes={noop}
      {...props}
    />,
  );

describe("SingleNotification auto-hide countdown", () => {
  let originalAnimate: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T05:00:00.000Z"));
    animate.mockClear();
    animationCancel.mockClear();
    originalAnimate = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "animate",
    );
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    if (originalAnimate) {
      Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });

  it("drains the bar from what is left of the countdown", () => {
    renderNotification();

    expect(animate).toHaveBeenCalledWith(
      [{ transform: "scaleX(0.5)" }, { transform: "scaleX(0)" }],
      {
        duration: 15_000,
        easing: "linear",
        fill: "forwards",
      },
    );
  });

  it("counts down from the arrival time when no auto-hide state was stored", () => {
    renderNotification({
      autoHideState: undefined,
      notification: { ...notification, receivedAtMs: Date.now() - 10_000 },
    });

    // The cleanup sweep removes this row 20s from now, so the bar must run
    // for what is left instead of restarting a full 30s countdown it would
    // never finish.
    expect(animate).toHaveBeenCalledWith(
      [{ transform: `scaleX(${20_000 / 30_000})` }, { transform: "scaleX(0)" }],
      expect.objectContaining({ duration: 20_000 }),
    );
  });

  it("runs the countdown to the stored deadline after the category duration was shortened", () => {
    renderNotification({
      autoHideState: {
        deadlineMs: Date.now() + 40_000,
        durationMs: 60_000,
        pausedRemainingMs: null,
      },
    });

    // The sweep removes this row 40s from now; a countdown cut to the new 30s
    // duration would hide the row 10s early while it still takes clicks.
    expect(animate).toHaveBeenCalledWith(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      expect.objectContaining({ duration: 40_000 }),
    );
  });

  it("holds the countdown while the player points at the row or focuses inside it", () => {
    const onPauseAutoHide = vi.fn<(listKey: string) => void>();
    const onResumeAutoHide = vi.fn<(listKey: string) => void>();

    const { container } = renderNotification({
      onPauseAutoHide,
      onResumeAutoHide,
    });

    const row = container.firstElementChild;

    if (!(row instanceof HTMLElement)) throw new Error("Expected a row");
    const muteButton = screen.getAllByRole("button")[0];

    fireEvent.pointerEnter(row);
    fireEvent.focus(muteButton);
    fireEvent.pointerLeave(row);

    // Keyboard focus still sits in the row, so the countdown stays paused.
    expect(onPauseAutoHide).toHaveBeenCalledOnce();
    expect(onResumeAutoHide).not.toHaveBeenCalled();

    fireEvent.blur(muteButton, { relatedTarget: document.body });

    expect(onResumeAutoHide).toHaveBeenCalledExactlyOnceWith(
      notification.listKey,
    );
  });
});
