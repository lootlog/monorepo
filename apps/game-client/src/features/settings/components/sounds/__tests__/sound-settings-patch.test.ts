import { mergeSoundSettingsPatches } from "../sound-settings-patch";

describe("mergeSoundSettingsPatches", () => {
  it("keeps multiple sound updates queued during the same debounce window", () => {
    const messagePatch = {
      notificationsConfig: {
        message: {
          volume: 0.4,
          soundUrl: "https://example.com/message.mp3",
        },
      },
    };
    const elitePatch = {
      notificationsConfig: {
        ELITE2: {
          volume: 0.7,
          soundUrl: "https://example.com/elite2.mp3",
        },
      },
    };

    expect(mergeSoundSettingsPatches(messagePatch, elitePatch)).toEqual({
      notificationsConfig: {
        message: messagePatch.notificationsConfig.message,
        ELITE2: elitePatch.notificationsConfig.ELITE2,
      },
    });
  });

  it("merges partial updates for the same sound entry", () => {
    expect(
      mergeSoundSettingsPatches(
        {
          detectorConfig: {
            HERO: {
              volume: 0.35,
              soundUrl: "https://example.com/hero.mp3",
            },
          },
        },
        { detectorConfig: { HERO: { soundUrl: "" } } },
      ),
    ).toEqual({
      detectorConfig: {
        HERO: { volume: 0.35, soundUrl: "" },
      },
    });
  });
});
