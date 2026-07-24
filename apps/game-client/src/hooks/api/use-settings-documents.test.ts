import {
  getChatAppearanceFromSettingsDocuments,
  updateChatAppearanceInSettingsDocuments,
} from "./use-settings-documents";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/types";
import { describe, expect, it } from "vitest";

describe("settings documents helpers", () => {
  it("normalizes chat appearance from the effective appearance document", () => {
    expect(
      getChatAppearanceFromSettingsDocuments({
        domains: {
          appearance: {
            effective: {
              chat: {
                ...CHAT_APPEARANCE_READABLE_PRESET,
                fontScalePercent: 125,
              },
            },
            layers: [],
            sources: {},
            schemaVersion: 1,
          },
        },
      }),
    ).toEqual({
      ...CHAT_APPEARANCE_READABLE_PRESET,
      fontScalePercent: 125,
    });
  });

  it("optimistically patches effective chat without changing document layers", () => {
    const settingsDocuments = {
      domains: {
        appearance: {
          effective: {
            chat: CHAT_APPEARANCE_READABLE_PRESET,
          },
          layers: [
            {
              scope: { type: "USER" as const, id: "user-1" },
              overrides: {},
            },
          ],
          sources: {},
          schemaVersion: 1,
        },
      },
    };

    expect(
      updateChatAppearanceInSettingsDocuments(settingsDocuments, {
        messageGapPx: 10,
      }),
    ).toMatchObject({
      domains: {
        appearance: {
          effective: {
            chat: {
              messageGapPx: 10,
            },
          },
          layers: settingsDocuments.domains.appearance.layers,
        },
      },
    });
  });
});
