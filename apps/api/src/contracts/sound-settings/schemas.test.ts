import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  SoundSettingsResponse,
  UpdateSoundSettingsRequest,
} from "./schemas.js";

const decodeUpdate = Schema.decodeUnknownSync(UpdateSoundSettingsRequest);

describe("sound settings contracts", () => {
  it("preserves partial category updates and strips unsupported settings without coercing volumes", () => {
    expect(
      decodeUpdate({
        masterVolume: 0.5,
        ignored: true,
        notificationsConfig: {
          HERO: { volume: 1, soundUrl: "", ignored: true },
          UNKNOWN: { volume: 1 },
        },
      }),
    ).toEqual({
      masterVolume: 0.5,
      notificationsConfig: { HERO: { volume: 1, soundUrl: "" } },
    });
    expect(() => decodeUpdate({ masterVolume: "0.5" })).toThrow();
    expect(() =>
      decodeUpdate({ notificationsConfig: { HERO: { volume: 1.01 } } }),
    ).toThrow();
    // URI is documentation metadata; existing clients may store non-URL sound keys.
    expect(
      decodeUpdate({ timersConfig: { TITAN: { soundUrl: "sound-key" } } }),
    ).toEqual({ timersConfig: { TITAN: { soundUrl: "sound-key" } } });
  });

  it("accepts recursive JSON settings while rejecting non-finite and non-JSON stored values", () => {
    const response = {
      userId: "user",
      masterVolume: 1,
      notificationsVolume: 1,
      detectorVolume: 1,
      timersVolume: 1,
      pingsVolume: 1,
      notificationsConfig: { nested: [null, "sound", { enabled: true }] },
      detectorConfig: null,
      timersConfig: [],
      createdAt: "2026-09-04T12:00:00Z",
      updatedAt: "2026-09-04T12:00:00Z",
    };
    const decode = Schema.decodeUnknownSync(SoundSettingsResponse);
    expect(decode(response)).toEqual(response);
    expect(() =>
      decode({ ...response, notificationsConfig: { volume: Number.NaN } }),
    ).toThrow();
    expect(() =>
      decode({ ...response, timersConfig: { callback: () => undefined } }),
    ).toThrow();
  });
});
