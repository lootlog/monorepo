import { useChatAppearanceDraft } from "./use-chat-appearance-draft";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-4">
      <SettingsSection
        controlId="chat-preset"
        title={t("settings.chat.preset.section")}
        actions={
          activePreset === "custom" ? (
            <Button
              onClick={() => {
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
          className="ll:grid ll:gap-1 ll:px-2 ll:pt-1"
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
          controlClassName="ll:w-48 ll:gap-2"
        >
          <Slider
            id="chat-font-scale"
            aria-label={t("settings.chat.fontScale.label")}
            min={CHAT_FONT_SCALE_MIN_PERCENT}
            max={CHAT_FONT_SCALE_MAX_PERCENT}
            step={5}
            value={draft.fontScalePercent}
            onValueChange={(fontScalePercent) =>
              updateDraft({ fontScalePercent })
            }
            onValueCommitted={(fontScalePercent) => {
              commit({ fontScalePercent });
            }}
          />
          <span className="ll:w-10 ll:shrink-0 ll:text-right ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
            {draft.fontScalePercent}%
          </span>
        </SettingsRow>
        <SettingsRow
          controlId="chat-message-gap"
          label={t("settings.chat.messageGap.label")}
          controlClassName="ll:w-48 ll:gap-2"
        >
          <Slider
            id="chat-message-gap"
            aria-label={t("settings.chat.messageGap.label")}
            min={CHAT_MESSAGE_GAP_MIN_PX}
            max={CHAT_MESSAGE_GAP_MAX_PX}
            value={draft.messageGapPx}
            onValueChange={(messageGapPx) => updateDraft({ messageGapPx })}
            onValueCommitted={(messageGapPx) => {
              commit({ messageGapPx });
            }}
          />
          <span className="ll:w-10 ll:shrink-0 ll:text-right ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
            {draft.messageGapPx}px
          </span>
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
        <SettingsRow
          htmlFor="chat-metadata-show-npc-location"
          label={t("settings.chat.metadata.showNpcLocationAndCoordinates")}
        >
          <Switch
            id="chat-metadata-show-npc-location"
            checked={draft.showNpcLocationAndCoordinates}
            onCheckedChange={(checked) => {
              updateAndCommit({ showNpcLocationAndCoordinates: checked });
            }}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
