import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { HeroTrackerStatus } from "@/components/hero-tracker-status";
import { ListRow } from "@/components/list-row";
import { ListRowArrival } from "@/components/list-row-arrival";
import { NpcTile } from "@/components/npc-tile";
import { IconButton } from "@/components/ui/icon-button";
import { NpcType } from "@/api/npcs.api";
import { cn } from "cn";
import { getNpcType } from "@lootlog/domain/npc-type";
import {
  getDetectorNpcSettings,
  type DetectorSettings,
} from "@lootlog/schema/account-preferences";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type {
  GameNpcWithLocation,
  NpcDetectorState,
} from "@/store/npc-detector.store";
import { AlertTriangle, Megaphone, Users, XIcon } from "lucide-react";
import {
  getArrivalStrength,
  getNotificationColors,
} from "@/utils/notifications-and-detector/background";
import {
  resolveNpcGatheringGuildId,
  resolveNpcNotificationRouting,
} from "@/utils/notifications-and-detector/npc-notification";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import type { useWindowsStore } from "@/store/windows.store";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import { readReadyRoomCache } from "@/features/party-finder/hooks/use-ready-rooms";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useTranslation } from "react-i18next";
import type { PartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { NpcNotificationCooldown } from "@/features/npc-detector/components/npc-notification-cooldown";
import { NPC_NOTIFICATION_COOLDOWN_MS } from "@/features/npc-detector/hooks/use-npc-list-lifecycle";
import { NotificationChatPublishError } from "@/features/chat/hooks/use-notification-chat-orchestration";

type NpcListItemProps = {
  animationEffectsEnabled: boolean;
  npc: GameNpcWithLocation;
  detectionAnimationCycle: number | null;
  detectorSettings: DetectorSettings;
  hasActivePartyGathering: boolean;
  hasMultipleNpcs: boolean;
  orchestration: Pick<
    PartyGatheringOrchestration,
    | "isCreatingNpcPartyGathering"
    | "isSendingNpcNotification"
    | "startNpcNotification"
    | "startNpcPartyGathering"
  >;
  removeNpc: NpcDetectorState["removeNpc"];
  setNpcStates: NpcDetectorState["setNpcStates"];
  setOpen: ReturnType<typeof useWindowsStore.getState>["setOpen"];
  npcTypeColors?: NpcTypeColors;
};

export const NpcListItem = ({
  animationEffectsEnabled,
  npc,
  detectionAnimationCycle,
  detectorSettings,
  hasActivePartyGathering,
  hasMultipleNpcs,
  orchestration,
  removeNpc,
  setNpcStates,
  setOpen,
  npcTypeColors,
}: NpcListItemProps) => {
  const { t } = useTranslation("npcDetector");
  const selectedGuildId = useSelectedLootlogGuildId();

  const {
    isCreatingNpcPartyGathering,
    isSendingNpcNotification,
    startNpcNotification,
    startNpcPartyGathering,
  } = orchestration;

  const npcType = getNpcType(NpcType, { ...npc, name: npc.nick });
  const settingsByNpcType = getDetectorNpcSettings(detectorSettings, npcType);

  const { guildIds: resolvedGuildIds, world } = resolveNpcNotificationRouting({
    routingRules: detectorSettings.routingRules,
    npcLevel: npc.lvl,
  });

  const gatheringGuildId = resolveNpcGatheringGuildId(
    resolvedGuildIds,
    selectedGuildId,
  );

  const handleOpenDetectorSettings = () => {
    setOpen("settings", true, {
      activeTab: "npc-detector" satisfies SettingsTabValue,
    });
  };

  // Only the cooldown changes: the detection may have moved or updated while
  // the request was in flight.
  const markNotificationSent = () =>
    setNpcStates([{ npcId: npc.id, npc: { notificationSentAt: Date.now() } }]);

  // Both actions show only while routing resolves an Organization.
  const handleSendNotification = async () => {
    const markAlertSent = () => {
      markNotificationSent();

      if (selectOwnedReadyRoom(readReadyRoomCache()))
        setOpen("party-finder", true);
    };

    try {
      await startNpcNotification({ npc, guildIds: resolvedGuildIds, world });
      markAlertSent();
    } catch (error) {
      if (error instanceof NotificationChatPublishError) {
        console.warn("Failed to publish notification to chat:", error.cause);
        // The alert was accepted, so the row leaves its sendable state:
        // another alert would reopen the recipients' alarm.
        markAlertSent();
        showRuntimeMessage(t("actions.chatPublishFailed"));

        return;
      }

      console.warn("Failed to send notification:", error);
      showRuntimeMessage(t("actions.messageFailed"));
    }
  };

  const handleGatherParty = async () => {
    if (!gatheringGuildId) return;

    try {
      await startNpcPartyGathering({ npc, guildId: gatheringGuildId, world });
      markNotificationSent();
    } catch (error) {
      console.warn("Failed to gather party:", error);
      showRuntimeMessage(t("actions.gatherPartyFailed"));
    }
  };

  const colors = getNotificationColors(
    npcType,
    settingsByNpcType?.highlight,
    npcTypeColors,
  );

  const shouldPlayDetectionAnimation =
    animationEffectsEnabled && detectionAnimationCycle !== null;

  return (
    <ListRow
      fill={colors.background}
      className={cn(
        "ll:relative ll:h-full ll:gap-1.5 ll:overflow-hidden ll:font-normal",
        shouldPlayDetectionAnimation && "ll-row-settle",
      )}
    >
      {shouldPlayDetectionAnimation ? (
        <ListRowArrival
          key={detectionAnimationCycle}
          accent={colors.border}
          strength={getArrivalStrength(npcType)}
        />
      ) : null}
      <NpcTile npc={npc} />
      <div className="ll:relative ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:leading-tight">
        <div className="ll:flex ll:gap-1 ll:overflow-hidden ll:text-xs">
          <span className="ll:min-w-0 ll:truncate ll:font-semibold">
            {npc.nick}
          </span>
          <span className="ll:shrink-0">
            ({npc.lvl}
            {npc.prof})
          </span>
          {npcType === NpcType.HERO_TRACKER && (
            <HeroTrackerStatus entranceClosesAt={npc.entranceClosesAt} />
          )}
        </div>
        <div className="ll:flex ll:gap-1 ll:overflow-hidden ll:text-[11px] ll:text-gray-300">
          <span className="ll:min-w-0 ll:truncate">{npc.location}</span>
          <span className="ll:shrink-0 ll:tabular-nums">
            ({npc.x}, {npc.y})
          </span>
        </div>
      </div>
      <div className="ll:relative ll:flex ll:shrink-0 ll:items-center">
        {resolvedGuildIds.length === 0 && (
          <IconButton
            label={t("actions.openSettingsAria")}
            tooltip={t("actions.noMatchingGuilds")}
            onClick={handleOpenDetectorSettings}
          >
            <AlertTriangle aria-hidden className="ll:stroke-yellow-500" />
          </IconButton>
        )}
        {resolvedGuildIds.length > 0 && (
          <>
            <IconButton
              label={
                npc.notificationSentAt !== null
                  ? t("actions.messageSent")
                  : t("actions.message")
              }
              className="ll:relative"
              disabled={
                isSendingNpcNotification || npc.notificationSentAt !== null
              }
              onClick={() => void handleSendNotification()}
            >
              {npc.notificationSentAt !== null ? (
                <NpcNotificationCooldown
                  key={npc.notificationSentAt}
                  animationEffectsEnabled={animationEffectsEnabled}
                  endsAt={npc.notificationSentAt + NPC_NOTIFICATION_COOLDOWN_MS}
                />
              ) : (
                <Megaphone aria-hidden />
              )}
            </IconButton>
            <IconButton
              label={
                isCreatingNpcPartyGathering
                  ? t("actions.gatheringParty")
                  : hasActivePartyGathering
                    ? t("actions.alreadyGatheringParty")
                    : t("actions.gatherParty")
              }
              loading={isCreatingNpcPartyGathering}
              disabled={hasActivePartyGathering}
              onClick={() => void handleGatherParty()}
            >
              <Users aria-hidden />
            </IconButton>
          </>
        )}
        {hasMultipleNpcs && (
          <IconButton
            variant="quiet-destructive"
            label={t("actions.removeNpcAria")}
            onClick={() => removeNpc(npc.id)}
          >
            <XIcon aria-hidden />
          </IconButton>
        )}
      </div>
    </ListRow>
  );
};
