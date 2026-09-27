import { toast } from "sonner";
import { ListRow } from "@/components/list-row";
import { ListRowArrival } from "@/components/list-row-arrival";
import { NpcTile } from "@/components/npc-tile";
import { IconButton } from "@/components/ui/icon-button";
import { NpcType } from "@/api/npcs.api";
import { cn } from "cn";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
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
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { resolveNpcNotificationRouting } from "@/utils/notifications-and-detector/npc-notification";
import type { useWindowsStore } from "@/store/windows.store";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import { readReadyRoomCache } from "@/features/party-finder/hooks/use-ready-rooms";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useTranslation } from "react-i18next";
import type { PartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { NpcNotificationCooldown } from "@/features/npc-detector/components/npc-notification-cooldown";
import { NPC_NOTIFICATION_COOLDOWN_MS } from "@/features/npc-detector/hooks/use-npc-list-lifecycle";

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
  setNpcState: NpcDetectorState["setNpcState"];
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
  setNpcState,
  setOpen,
  npcTypeColors,
}: NpcListItemProps) => {
  const { t } = useTranslation("npcDetector");

  const {
    isCreatingNpcPartyGathering,
    isSendingNpcNotification,
    startNpcNotification,
    startNpcPartyGathering,
  } = orchestration;

  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
  const settingsByNpcType = getDetectorNpcSettings(detectorSettings, npcType);

  const { guildIds: resolvedGuildIds, world } = resolveNpcNotificationRouting({
    routingRules: detectorSettings.routingRules,
    npcLevel: npc.lvl,
  });

  const key = npcType;

  const handleRemoveNpc = (npcId: number) => {
    removeNpc(npcId);
  };

  const handleOpenDetectorSettings = () => {
    setOpen("settings", true, {
      activeTab: "npc-detector" satisfies SettingsTabValue,
    });
  };

  const handleSendNotification = async (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      toast.error(t("actions.noMatchingGuilds"));

      return;
    }

    if (!npc || !world) return;

    try {
      await startNpcNotification({
        npc,
        guildIds: resolvedGuildIds,
        world,
      });

      setNpcState(npc.id, {
        ...npc,
        notificationSentAt: Date.now(),
      });

      if (selectOwnedReadyRoom(readReadyRoomCache()))
        setOpen("party-finder", true);
    } catch (error) {
      console.warn("Failed to send notification:", error);
      toast.error(t("actions.messageFailed"));
    }
  };

  const handleGatherParty = async (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      toast.error(t("actions.noMatchingGuilds"));

      return;
    }

    if (!npc || !world) return;

    try {
      await startNpcPartyGathering({
        npc,
        guildIds: resolvedGuildIds,
        world,
      });

      setNpcState(npc.id, {
        ...npc,
        notificationSentAt: Date.now(),
      });
    } catch (error) {
      console.warn("Failed to gather party:", error);
      toast.error(t("actions.gatherPartyFailed"));
    }
  };

  const background = getBackgroundColor(
    key,
    settingsByNpcType?.highlight,
    npcTypeColors,
  );

  const borderColor = getBorderColor(
    key,
    settingsByNpcType?.highlight,
    npcTypeColors,
  );

  const shouldPlayDetectionAnimation =
    animationEffectsEnabled && detectionAnimationCycle !== null;

  return (
    <ListRow
      fill={background}
      className={cn(
        "ll:relative ll:h-full ll:gap-1.5 ll:overflow-hidden ll:font-normal",
        shouldPlayDetectionAnimation && "ll-row-settle",
      )}
    >
      {shouldPlayDetectionAnimation ? (
        <ListRowArrival
          key={detectionAnimationCycle}
          accent={borderColor}
          strength={getArrivalStrength(key)}
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
              onClick={() => void handleSendNotification(npc)}
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
              onClick={() => void handleGatherParty(npc)}
            >
              <Users aria-hidden />
            </IconButton>
          </>
        )}
        {hasMultipleNpcs && (
          <IconButton
            variant="quiet-destructive"
            label={t("actions.removeNpcAria")}
            onClick={() => handleRemoveNpc(npc.id)}
          >
            <XIcon aria-hidden />
          </IconButton>
        )}
      </div>
    </ListRow>
  );
};
