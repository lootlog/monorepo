import { act, renderHook } from "@testing-library/react";
import type { UpdateSoundSettingsDto } from "@/lib/api/generated/main/model";
import { useSoundSettingsPatchQueue } from "../use-sound-settings-patch-queue";

describe("useSoundSettingsPatchQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes rapid sound changes as one merged request", () => {
    const updateSettings = vi.fn<(payload: UpdateSoundSettingsDto) => void>();
    const { result } = renderHook(() =>
      useSoundSettingsPatchQueue(updateSettings),
    );

    act(() => {
      result.current({
        notificationsConfig: {
          message: { soundUrl: "https://example.com/message.mp3" },
        },
      });
      result.current({
        notificationsConfig: {
          ELITE2: { soundUrl: "https://example.com/elite2.mp3" },
        },
      });
    });

    expect(updateSettings).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith({
      notificationsConfig: {
        message: { soundUrl: "https://example.com/message.mp3" },
        ELITE2: { soundUrl: "https://example.com/elite2.mp3" },
      },
    });
  });
});
