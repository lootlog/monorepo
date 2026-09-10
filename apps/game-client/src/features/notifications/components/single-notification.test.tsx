import { render } from "@testing-library/react";
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
  message: "hello",
  notificationId: "notification-1",
  receivedAtMs: 1,
  servers: ["guild-1"],
  type: "chat-mention",
  world: "world",
};

const categorySettings: NotificationSettings = {
  autoHideTimeout: 30,
  guildIds: [],
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

const renderNotification = () =>
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
    />,
  );

describe("SingleNotification auto-hide perimeter", () => {
  let originalAnimate: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T05:00:00.000Z"));
    animate.mockClear();
    animationCancel.mockClear();
    originalAnimate = Object.getOwnPropertyDescriptor(
      SVGElement.prototype,
      "animate",
    );
    Object.defineProperty(SVGElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 64,
      height: 64,
      left: 0,
      right: 242,
      top: 0,
      width: 242,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    if (originalAnimate) {
      Object.defineProperty(SVGElement.prototype, "animate", originalAnimate);
    } else {
      Reflect.deleteProperty(SVGElement.prototype, "animate");
    }
  });

  it("drains the visible border monotonically around the rendered perimeter", () => {
    const { container } = renderNotification();
    const progressPath = container.querySelectorAll("path")[1];

    expect(progressPath).not.toHaveAttribute("pathLength");
    expect(progressPath).toHaveStyle({
      strokeDasharray: "612 1224",
      strokeDashoffset: "306",
    });
    expect(animate).toHaveBeenCalledWith(
      [{ strokeDashoffset: "306" }, { strokeDashoffset: "612" }],
      {
        duration: 15_000,
        easing: "linear",
        fill: "forwards",
      },
    );
  });
});
