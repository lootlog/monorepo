import { useChatAppearanceDraft } from "./use-chat-appearance-draft";
import {
  SettingsChoiceCards,
  type SettingsChoiceOption,
} from "@/components/settings/settings-choice-card";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettingsStore } from "@/store/settings.store";
import {
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
} from "@lootlog/schema/chat-appearance";
import { getChatAppearancePreset } from "@lootlog/domain/chat-appearance";
import { useTranslation } from "react-i18next";
import { SettingsHelpPopover } from "../shared/settings-help-popover";

const METADATA_KEYS = [
  "showTimestamp",
  "showGuildLabel",
  "showNpcAvatar",
  "showNpcLevel",
  "showNpcLocationAndCoordinates",
] as const;

type ChatPresetChoice = "readable" | "compact" | "custom";

export const ChatAppearanceSettingsForm = () => {
  const { t } = useTranslation();

  const allowWorldSelection = useSettingsStore(
    (state) => state.allowWorldSelection ?? false,
  );

  const { draft, updateDraft, commit, updateAndCommit, applyPreset } =
    useChatAppearanceDraft();

  const activePreset = getChatAppearancePreset(draft);

  const presetOptions: SettingsChoiceOption<ChatPresetChoice>[] = [
    {
      value: "readable",
      title: t("settings.chat.preset.readable"),
      description: t("settings.chat.preset.readableDescription"),
    },
    {
      value: "compact",
      title: t("settings.chat.preset.compact"),
      description: t("settings.chat.preset.compactDescription"),
    },
    ...(activePreset === "custom"
      ? [
          {
            value: "custom" as const,
            title: t("settings.chat.preset.custom"),
            description: t("settings.chat.preset.customDescription"),
          },
        ]
      : []),
  ];

  const visibleMetadataKeys = allowWorldSelection
    ? METADATA_KEYS
    : METADATA_KEYS.filter((key) => key !== "showGuildLabel");

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="chat-preset"
        title={t("settings.chat.preset.section")}
      >
        <SettingsChoiceCards
          id="chat-preset"
          label={t("settings.chat.preset.label")}
          options={presetOptions}
          value={activePreset}
          onChange={(preset) => {
            if (preset !== "custom") applyPreset(preset);
          }}
        />
      </SettingsSection>

      <SettingsSection title={t("settings.chat.layout.section")}>
        <SettingsRow
          controlId="chat-npc-layout"
          label={
            <span className="ll:inline-flex ll:items-center">
              {t("settings.chat.npcLayout.label")}
              <SettingsHelpPopover
                description={t("settings.chat.npcLayout.description")}
                recommendation={t("settings.chat.npcLayout.recommendation")}
                example={t("settings.chat.npcLayout.example")}
              />
            </span>
          }
        >
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[draft.npcLayout]}
            onValueChange={([npcLayout]: ("tile" | "inline")[]) => {
              if (!npcLayout) return;
              updateAndCommit({ npcLayout });
            }}
          >
            <ToggleGroupItem value="tile">
              {t("settings.chat.npcLayout.tile")}
            </ToggleGroupItem>
            <ToggleGroupItem value="inline">
              {t("settings.chat.npcLayout.inline")}
            </ToggleGroupItem>
          </ToggleGroup>
        </SettingsRow>
        <SettingsRow
          controlId="chat-font-scale"
          label={t("settings.chat.fontScale.label")}
          description={t("settings.chat.fontScale.description")}
          controlClassName="ll:w-48"
        >
          <SettingsSliderField
            id="chat-font-scale"
            aria-label={t("settings.chat.fontScale.label")}
            min={CHAT_FONT_SCALE_MIN_PERCENT}
            max={CHAT_FONT_SCALE_MAX_PERCENT}
            step={5}
            unit="%"
            value={draft.fontScalePercent}
            onValueChange={(fontScalePercent) =>
              updateDraft({ fontScalePercent })
            }
            onCommit={(fontScalePercent) => {
              commit({ fontScalePercent });
            }}
          />
        </SettingsRow>
        <SettingsRow
          controlId="chat-message-gap"
          label={t("settings.chat.messageGap.label")}
          description={t("settings.chat.messageGap.description")}
          controlClassName="ll:w-48"
        >
          <SettingsSliderField
            id="chat-message-gap"
            aria-label={t("settings.chat.messageGap.label")}
            min={CHAT_MESSAGE_GAP_MIN_PX}
            max={CHAT_MESSAGE_GAP_MAX_PX}
            unit="px"
            value={draft.messageGapPx}
            onValueChange={(messageGapPx) => updateDraft({ messageGapPx })}
            onCommit={(messageGapPx) => {
              commit({ messageGapPx });
            }}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        controlId="chat-metadata"
        title={t("settings.chat.metadata.title")}
      >
        {visibleMetadataKeys.map((key) => (
          <SettingsRow
            key={key}
            htmlFor={`chat-metadata-${key}`}
            label={t(`settings.chat.metadata.${key}`)}
            description={t(`settings.chat.metadata.${key}Description`)}
          >
            <Switch
              id={`chat-metadata-${key}`}
              checked={draft[key]}
              onCheckedChange={(checked) => {
                updateAndCommit({ [key]: checked });
              }}
            />
          </SettingsRow>
        ))}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
