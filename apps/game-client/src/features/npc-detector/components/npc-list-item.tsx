import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { NpcType } from "@/api/npcs.api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type {
  DetectorNpcType,
  DetectorSettings,
} from "@lootlog/schema/account-preferences";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type {
  GameNpcWithLocation,
  NpcDetectorState,
} from "@/store/npc-detector.store";
import { AlertTriangle, Loader2, Megaphone, Users, XIcon } from "lucide-react";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { resolveNpcNotificationRouting } from "@/utils/notifications-and-detector/npc-notification";
import type { useWindowsStore } from "@/store/windows.store";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useTranslation } from "react-i18next";
import type { PartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { NPC_DETECTOR_CLOCK_INTERVAL_MS } from "@/features/npc-detector/hooks/use-npc-detector-clock";
import { NPC_NOTIFICATION_COOLDOWN_MS } from "@/features/npc-detector/hooks/use-npc-list-lifecycle";

const MESSAGE_BUTTON_COOLDOWN_RING_RADIUS = 11;
const MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE =
  2 * Math.PI * MESSAGE_BUTTON_COOLDOWN_RING_RADIUS;
const ACTION_BUTTON_CLASS_NAME = "ll:size-7 ll:px-0";

type NpcListItemProps = {
  animationEffectsEnabled: boolean;
  npc: GameNpcWithLocation;
  detectionAnimationCycle: number | null;
  detectorSettings: DetectorSettings;
  hasActivePartyGathering: boolean;
  hasMultipleNpcs: boolean;
  notificationCooldownCurrentTimeMs: number;
  notificationCooldownEndsAt: number | null;
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

export const NPCS_WITH_LOCATION = [NpcType.HERO];

const getRepeatDetectionFlashFrames = (npcType: string) => {
  if (npcType === NpcType.TITAN) {
    return {
      overlayBackground:
        "radial-gradient(circle at center, rgba(255,255,255,0.82) 0%, rgba(219,234,254,0.7) 20%, rgba(125,211,252,0.42) 40%, rgba(34,211,238,0.16) 60%, rgba(34,211,238,0) 80%)",
      glowShadow:
        "inset 0 0 0 1px rgba(219,234,254,0.82), inset 0 0 34px rgba(125,211,252,0.4), inset 0 0 60px rgba(34,211,238,0.16)",
    };
  }

  if (npcType === NpcType.COLOSSUS) {
    return {
      overlayBackground:
        "radial-gradient(circle at center, rgba(236,253,245,0.82) 0%, rgba(167,243,208,0.66) 20%, rgba(45,212,191,0.42) 40%, rgba(20,184,166,0.16) 60%, rgba(20,184,166,0) 80%)",
      glowShadow:
        "inset 0 0 0 1px rgba(167,243,208,0.8), inset 0 0 30px rgba(45,212,191,0.34), inset 0 0 54px rgba(20,184,166,0.14)",
    };
  }

  if (npcType === NpcType.ELITE2) {
    return {
      overlayBackground:
        "radial-gradient(circle at center, rgba(250,245,255,0.82) 0%, rgba(233,213,255,0.68) 20%, rgba(217,70,239,0.42) 40%, rgba(192,38,211,0.16) 60%, rgba(192,38,211,0) 80%)",
      glowShadow:
        "inset 0 0 0 1px rgba(233,213,255,0.82), inset 0 0 30px rgba(217,70,239,0.34), inset 0 0 54px rgba(192,38,211,0.14)",
    };
  }

  if (npcType === NpcType.HERO) {
    return {
      overlayBackground:
        "radial-gradient(circle at center, rgba(255,247,237,0.82) 0%, rgba(254,215,170,0.68) 20%, rgba(251,146,60,0.42) 40%, rgba(249,115,22,0.16) 60%, rgba(249,115,22,0) 80%)",
      glowShadow:
        "inset 0 0 0 1px rgba(254,215,170,0.82), inset 0 0 30px rgba(251,146,60,0.34), inset 0 0 54px rgba(249,115,22,0.14)",
    };
  }

  return {
    overlayBackground:
      "radial-gradient(circle at center, rgba(243,244,246,0.82) 0%, rgba(209,213,219,0.62) 20%, rgba(156,163,175,0.36) 40%, rgba(107,114,128,0.14) 60%, rgba(107,114,128,0) 80%)",
    glowShadow:
      "inset 0 0 0 1px rgba(209,213,219,0.8), inset 0 0 28px rgba(156,163,175,0.28), inset 0 0 48px rgba(107,114,128,0.12)",
  };
};

export const NpcListItem = ({
  animationEffectsEnabled,
  npc,
  detectionAnimationCycle,
  detectorSettings,
  hasActivePartyGathering,
  hasMultipleNpcs,
  notificationCooldownCurrentTimeMs,
  notificationCooldownEndsAt,
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
  const messageButtonCooldownTimeLeftMs = Math.max(
    0,
    (notificationCooldownEndsAt ??
      notificationCooldownCurrentTimeMs + NPC_NOTIFICATION_COOLDOWN_MS) -
      notificationCooldownCurrentTimeMs,
  );
  const messageButtonCooldownSecondsLeft = Math.max(
    1,
    Math.ceil(messageButtonCooldownTimeLeftMs / 1000),
  );
  const messageButtonCooldownRingOffset = animationEffectsEnabled
    ? MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE *
      (1 - messageButtonCooldownTimeLeftMs / NPC_NOTIFICATION_COOLDOWN_MS)
    : MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE;

  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
  const settingsByNpcType = detectorSettings[npcType as DetectorNpcType];
  const { guildIds: resolvedGuildIds, world } = resolveNpcNotificationRouting({
    routingRules: detectorSettings.routingRules,
    npcLevel: npc.lvl,
  });
  const key = npcType;
  const repeatDetectionFlashFrames = getRepeatDetectionFlashFrames(key);

  const isMessageButtonInCooldown = npc.notificationSent;

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
      showRuntimeMessage(t("actions.noMatchingGuilds"));
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
        notificationSent: true,
      });

      setOpen("party-finder", true);
    } catch (error) {
      console.warn("Failed to send notification:", error);
      showRuntimeMessage(t("actions.messageFailed"));
    }
  };

  const handleGatherParty = async (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      showRuntimeMessage(t("actions.noMatchingGuilds"));
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
        notificationSent: true,
      });
    } catch (error) {
      console.warn("Failed to gather party:", error);
      showRuntimeMessage(t("actions.gatherPartyFailed"));
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
  const content = (
    <>
      {animationEffectsEnabled ? (
        shouldPlayDetectionAnimation ? (
          <div
            key={detectionAnimationCycle}
            className="ll-npc-detection-flash ll:pointer-events-none ll:absolute ll:inset-0 ll:rounded-[inherit]"
            style={{
              background: repeatDetectionFlashFrames.overlayBackground,
              boxShadow: repeatDetectionFlashFrames.glowShadow,
            }}
          />
        ) : null
      ) : null}
      <NpcTile
        npc={npc}
        className="ll:w-auto ll:max-w-7 ll:max-h-10 ll:object-contain"
        containerClassName="ll:w-7 ll:h-10 ll:shrink-0"
      />
      <div className="ll:relative ll:flex ll:flex-col ll:flex-1 ll:min-w-0">
        <div className="ll:flex ll:text-xs ll:gap-1 ll:overflow-hidden">
          <span className="ll:font-semibold ll:truncate ll:min-w-0">
            {npc.nick}
          </span>
          <span className="ll:shrink-0">
            ({npc.lvl}
            {npc.prof})
          </span>
        </div>
        <div className="ll:flex ll:text-[11px] ll:text-gray-400 ll:gap-1 ll:overflow-hidden">
          <span className="ll:truncate ll:min-w-0">{npc.location}</span>
          <span className="ll:shrink-0">
            ({npc.x}, {npc.y})
          </span>
        </div>
      </div>
      <div className="ll:relative ll:flex ll:items-center ll:gap-1 ll:shrink-0">
        {resolvedGuildIds.length === 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`${ACTION_BUTTON_CLASS_NAME} ll:border-yellow-500/40 ll:hover:bg-yellow-500/10`}
                onClick={handleOpenDetectorSettings}
                aria-label={t("actions.openSettingsAria")}
              >
                <AlertTriangle
                  className="ll:stroke-yellow-500 ll:opacity-80"
                  size={12}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {t("actions.noMatchingGuilds")}
            </TooltipContent>
          </Tooltip>
        )}
        {resolvedGuildIds.length > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`ll:relative ${ACTION_BUTTON_CLASS_NAME}`}
                  disabled={isSendingNpcNotification || npc.notificationSent}
                  onClick={() => void handleSendNotification(npc)}
                >
                  {isMessageButtonInCooldown ? (
                    <>
                      {animationEffectsEnabled ? (
                        <svg
                          className="ll:absolute ll:inset-0 ll:size-full ll:-rotate-90"
                          viewBox="0 0 28 28"
                          aria-hidden="true"
                        >
                          <circle
                            cx="14"
                            cy="14"
                            r={MESSAGE_BUTTON_COOLDOWN_RING_RADIUS}
                            className="ll:stroke-white/15"
                            fill="none"
                            strokeWidth="2"
                          />
                          <circle
                            cx="14"
                            cy="14"
                            r={MESSAGE_BUTTON_COOLDOWN_RING_RADIUS}
                            className="ll:stroke-white ll:transition-[stroke-dashoffset] ll:ease-linear"
                            fill="none"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={
                              MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE
                            }
                            strokeDashoffset={messageButtonCooldownRingOffset}
                            style={{
                              transitionDuration: `${NPC_DETECTOR_CLOCK_INTERVAL_MS}ms`,
                            }}
                          />
                        </svg>
                      ) : null}
                      <span className="ll:relative ll:text-[10px] ll:font-semibold ll:tabular-nums">
                        {messageButtonCooldownSecondsLeft}
                      </span>
                    </>
                  ) : (
                    <Megaphone size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {npc.notificationSent
                  ? t("actions.messageSent")
                  : t("actions.message")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={ACTION_BUTTON_CLASS_NAME}
                  disabled={
                    isCreatingNpcPartyGathering || hasActivePartyGathering
                  }
                  onClick={() => void handleGatherParty(npc)}
                >
                  {isCreatingNpcPartyGathering ? (
                    <Loader2 size={12} className="ll:animate-spin" />
                  ) : (
                    <Users size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isCreatingNpcPartyGathering
                  ? t("actions.gatheringParty")
                  : hasActivePartyGathering
                    ? t("actions.alreadyGatheringParty")
                    : t("actions.gatherParty")}
              </TooltipContent>
            </Tooltip>
          </>
        )}
        {hasMultipleNpcs && (
          <Button
            variant="destructive"
            aria-label={t("actions.removeNpcAria")}
            className={ACTION_BUTTON_CLASS_NAME}
            onClick={() => handleRemoveNpc(npc.id)}
          >
            <XIcon size={12} />
          </Button>
        )}
      </div>
    </>
  );
  const className = cn(
    "ll:relative ll:overflow-hidden ll:flex ll:items-center ll:py-1 ll:gap-2 ll:px-2",
    "ll:border ll:rounded-sm",
    "ll:transition-[background-color] ll:duration-300",
  );
  const style = { background, borderColor };

  return (
    <div
      className={cn(
        className,
        shouldPlayDetectionAnimation && "ll-npc-detection-settle",
      )}
      style={style}
    >
      {content}
    </div>
  );
};
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
