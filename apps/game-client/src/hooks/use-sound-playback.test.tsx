import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { createNotificationTest } from "@/features/notifications/notification-test";
import { useSoundPlayback } from "./use-sound-playback";
let test: ReturnType<typeof createNotificationTest>;
describe("useSoundPlayback", () => {
  beforeEach(() => {
    test = createNotificationTest();
  });
  it("preloads after first interaction and reuses the media element", () => {
    const { result, unmount } = renderHook(() => useSoundPlayback(), {
      wrapper: test.wrapper,
    });
    expect(test.audio).toHaveLength(0);
    act(() => window.dispatchEvent(new Event("pointerdown")));
    expect(test.audio).toHaveLength(1);
    expect(test.audio[0]?.src).toBe(DEFAULT_SOUND_URLS.message);
    expect(test.audio[0]?.preload).toBe("auto");
    act(() => {
      result.current.playSound("notifications", "message");
      result.current.playSound("notifications", "message");
    });
    expect(test.audio).toHaveLength(1);
    expect(test.load).toHaveBeenCalledTimes(1);
    expect(test.play).toHaveBeenCalledTimes(2);
    expect(test.pause).toHaveBeenCalledTimes(1);
    unmount();
    expect(test.audio[0]?.getAttribute("src")).toBeNull();
    expect(test.audio[0]?.onended).toBeNull();
  });
  it("shares one cached media element across hook consumers", () => {
    const first = renderHook(() => useSoundPlayback(), {
      wrapper: test.wrapper,
    });
    const second = renderHook(() => useSoundPlayback(), {
      wrapper: test.wrapper,
    });
    act(() => window.dispatchEvent(new Event("pointerdown")));
    expect(test.audio).toHaveLength(1);
    first.unmount();
    expect(test.audio[0]?.getAttribute("src")).not.toBeNull();
    second.unmount();
    expect(test.audio[0]?.getAttribute("src")).toBeNull();
  });
  it("plays one sound when different settings keys resolve to the same URL", () => {
    test.soundSettings.notificationsConfig = {
      message: { volume: 0.5, soundUrl: "https://audio.test/shared.mp3" },
      HERO: { volume: 0.5, soundUrl: "https://audio.test/shared.mp3" },
    };
    test.setSounds();
    const { result, unmount } = renderHook(() => useSoundPlayback(), {
      wrapper: test.wrapper,
    });
    act(() => result.current.playSounds("notifications", ["message", "HERO"]));
    expect(test.audio).toHaveLength(1);
    expect(test.audio[0]?.src).toBe("https://audio.test/shared.mp3");
    expect(test.play).toHaveBeenCalledOnce();
    unmount();
  });
});
