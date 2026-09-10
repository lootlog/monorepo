import { useChatAppearanceDraft } from "./use-chat-appearance-draft";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { recordRecentlyChanged } from "@/features/settings/recently-changed.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
} from "@lootlog/schema/chat-appearance";
import { getChatAppearancePreset } from "@lootlog/domain/chat-appearance";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsHelpPopover } from "../shared/settings-help-popover";
import { ChatAppearancePresetCard } from "./chat-appearance-preset-card";

const METADATA_KEYS = [
  "showTimestamp",
  "showGuildLabel",
  "showNpcAvatar",
  "showNpcLevel",
] as const;

export const ChatAppearanceSettingsForm = () => {
  const { t } = useTranslation();

  const allowWorldSelection = useSettingsStore(
    (state) => state.allowWorldSelection ?? false,
  );

  const {
    draft,
    npcTypeColors,
    updateDraft,
    commit,
    updateAndCommit,
    applyPreset,
  } = useChatAppearanceDraft();

  const activePreset = getChatAppearancePreset(draft);

  const visibleMetadataKeys = allowWorldSelection
    ? METADATA_KEYS
    : METADATA_KEYS.filter((key) => key !== "showGuildLabel");

  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-[var(--ll-settings-space-lg)]">
      <SettingsSection
        controlId="chat-preset"
        title={t("settings.chat.preset.section")}
        actions={
          activePreset === "custom" ? (
            <Button
              onClick={() => {
                recordRecentlyChanged("chat-preset");
                applyPreset("readable");
              }}
              type="button"
              variant="ghost"
              className="ll:gap-1 ll:px-1.5"
            >
              <RotateCcw className="ll:size-3" aria-hidden="true" />
              {t("settings.chat.preset.restoreReadable")}
            </Button>
          ) : null
        }
      >
        <div
          className="ll:grid ll:gap-[var(--ll-settings-space-sm)] ll:px-2 ll:pt-1"
          id="chat-preset"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
          }}
        >
          <ChatAppearancePresetCard
            description={t("settings.chat.preset.readableDescription")}
            name={t("settings.chat.preset.readable")}
            npcTypeColors={npcTypeColors}
            onSelect={() => {
              recordRecentlyChanged("chat-preset");
              applyPreset("readable");
            }}
            selected={activePreset === "readable"}
            settings={CHAT_APPEARANCE_READABLE_PRESET}
          />
          <ChatAppearancePresetCard
            description={t("settings.chat.preset.compactDescription")}
            name={t("settings.chat.preset.compact")}
            npcTypeColors={npcTypeColors}
            onSelect={() => {
              recordRecentlyChanged("chat-preset");
              applyPreset("compact");
            }}
            selected={activePreset === "compact"}
            settings={CHAT_APPEARANCE_COMPACT_PRESET}
          />
        </div>
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
          description={t("settings.chat.npcLayout.description")}
        >
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[draft.npcLayout]}
            onValueChange={([npcLayout]: ("tile" | "inline")[]) => {
              if (!npcLayout) return;
              recordRecentlyChanged("chat-npc-layout");
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
          controlClassName="ll:w-40"
        >
          <Slider
            id="chat-font-scale"
            aria-label={t("settings.chat.fontScale.label")}
            min={CHAT_FONT_SCALE_MIN_PERCENT}
            max={CHAT_FONT_SCALE_MAX_PERCENT}
            step={5}
            value={[draft.fontScalePercent]}
            formatValue={(value) => `${value}%`}
            formatEndpoint={(value) => `${value}%`}
            onValueChange={([fontScalePercent]) =>
              updateDraft({ fontScalePercent })
            }
            onValueCommit={([fontScalePercent]) => {
              recordRecentlyChanged("chat-font-scale");
              commit({ fontScalePercent });
            }}
          />
        </SettingsRow>
        <SettingsRow
          controlId="chat-message-gap"
          label={t("settings.chat.messageGap.label")}
          controlClassName="ll:w-40"
        >
          <Slider
            id="chat-message-gap"
            aria-label={t("settings.chat.messageGap.label")}
            min={CHAT_MESSAGE_GAP_MIN_PX}
            max={CHAT_MESSAGE_GAP_MAX_PX}
            value={[draft.messageGapPx]}
            formatValue={(value) => `${value}px`}
            formatEndpoint={(value) => `${value}px`}
            onValueChange={([messageGapPx]) => updateDraft({ messageGapPx })}
            onValueCommit={([messageGapPx]) => {
              recordRecentlyChanged("chat-message-gap");
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
          <SettingsRow key={key} label={t(`settings.chat.metadata.${key}`)}>
            <Switch
              aria-label={t(`settings.chat.metadata.${key}`)}
              checked={draft[key]}
              onCheckedChange={(checked) => {
                recordRecentlyChanged("chat-metadata");
                updateAndCommit({ [key]: checked });
              }}
            />
          </SettingsRow>
        ))}
        <SettingsRow
          label={t("settings.chat.metadata.showNpcLocationAndCoordinates")}
        >
          <Switch
            aria-label={t(
              "settings.chat.metadata.showNpcLocationAndCoordinates",
            )}
            checked={draft.showNpcLocationAndCoordinates}
            onCheckedChange={(checked) => {
              recordRecentlyChanged("chat-metadata");
              updateAndCommit({ showNpcLocationAndCoordinates: checked });
            }}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
