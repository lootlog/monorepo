import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { NpcType } from "@/api/npcs.api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { cn } from "@/lib/utils";
import { getNpcTypeByWt, type DetectorNpcType } from "@lootlog/types";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { AlertTriangle, Loader2, Megaphone, Users, XIcon } from "lucide-react";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { resolveNpcNotificationRouting } from "@/utils/notifications-and-detector/npc-notification";
import { useEffect, useState } from "react";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useTranslation } from "react-i18next";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";

const BUTTON_UNLOCK_DELAY_MS = 5000;
const REPEAT_DETECTION_FLASH_DURATION_MS = 1050;
const MESSAGE_BUTTON_COOLDOWN_RING_RADIUS = 11;
const MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE =
  2 * Math.PI * MESSAGE_BUTTON_COOLDOWN_RING_RADIUS;
const ACTION_BUTTON_CLASS_NAME = "ll:size-7 ll:px-0";

type NpcListItemProps = {
  npc: GameNpcWithLocation;
  detectionAnimationCycle: number | null;
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
  npc,
  detectionAnimationCycle,
}: NpcListItemProps) => {
  const { t } = useTranslation("npcDetector");
  const { npcs, removeNpc, setNpcState, clearDetectionAnimation } =
    useNpcDetectorStore();
  const { settings } = useCurrentGameAccountDetectorSettings();
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const ownedReadyRoom = usePartyFinderStore(selectOwnedReadyRoom);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const {
    isCreatingNpcPartyGathering,
    isSendingNpcNotification,
    startNpcNotification,
    startNpcPartyGathering,
  } = usePartyGatheringOrchestration();
  const [messageButtonCooldownEndsAt, setMessageButtonCooldownEndsAt] =
    useState<number | null>(null);
  const [
    messageButtonCooldownSecondsLeft,
    setMessageButtonCooldownSecondsLeft,
  ] = useState(0);
  const [messageButtonCooldownRingOffset, setMessageButtonCooldownRingOffset] =
    useState(0);

  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
  const settingsByNpcType = settings[npcType as DetectorNpcType];
  const { guildIds: resolvedGuildIds, world } = resolveNpcNotificationRouting({
    routingRules: settings.routingRules,
    npcLevel: npc.lvl,
  });
  const key = npcType;
  const repeatDetectionFlashFrames = getRepeatDetectionFlashFrames(key);

  const hasActivePartyGathering = ownedReadyRoom !== null;
  const isMessageButtonInCooldown = npc.notificationSent;

  useEffect(() => {
    if (!npc.notificationSent) return;

    const timer = setTimeout(() => {
      setNpcState(npc.id, { ...npc, notificationSent: false });
    }, BUTTON_UNLOCK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [npc, npc.id, npc.notificationSent, setNpcState]);

  useEffect(() => {
    if (!npc.notificationSent) {
      setMessageButtonCooldownEndsAt(null);
      setMessageButtonCooldownSecondsLeft(0);
      setMessageButtonCooldownRingOffset(0);
      return;
    }

    const cooldownEndsAt = Date.now() + BUTTON_UNLOCK_DELAY_MS;

    setMessageButtonCooldownEndsAt(cooldownEndsAt);
    setMessageButtonCooldownSecondsLeft(
      Math.ceil(BUTTON_UNLOCK_DELAY_MS / 1000),
    );
    setMessageButtonCooldownRingOffset(
      animationEffectsEnabled ? 0 : MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE,
    );

    if (!animationEffectsEnabled) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      setMessageButtonCooldownRingOffset(
        MESSAGE_BUTTON_COOLDOWN_RING_CIRCUMFERENCE,
      );
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [animationEffectsEnabled, npc.notificationSent]);

  useEffect(() => {
    if (messageButtonCooldownEndsAt === null) return;

    const updateCooldownSecondsLeft = () => {
      const cooldownMsLeft = messageButtonCooldownEndsAt - Date.now();

      if (cooldownMsLeft <= 0) {
        setMessageButtonCooldownSecondsLeft(0);
        return;
      }

      setMessageButtonCooldownSecondsLeft(Math.ceil(cooldownMsLeft / 1000));
    };

    updateCooldownSecondsLeft();

    const interval = window.setInterval(updateCooldownSecondsLeft, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [messageButtonCooldownEndsAt]);

  useEffect(() => {
    if (detectionAnimationCycle === null) return;

    const timer = window.setTimeout(() => {
      clearDetectionAnimation(npc.id, detectionAnimationCycle);
    }, REPEAT_DETECTION_FLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearDetectionAnimation, detectionAnimationCycle, npc.id]);

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
      window.message(t("actions.noMatchingGuilds"));
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
      window.message(t("actions.messageFailed"));
    }
  };

  const handleGatherParty = async (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      window.message(t("actions.noMatchingGuilds"));
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
      window.message(t("actions.gatherPartyFailed"));
    }
  };

  const background = getBackgroundColor(key, settingsByNpcType?.highlight);
  const borderColor = getBorderColor(key, settingsByNpcType?.highlight);
  const shouldPlayDetectionAnimation =
    animationEffectsEnabled && detectionAnimationCycle !== null;
  const content = (
    <>
      {animationEffectsEnabled ? (
        <AnimatePresence mode="wait">
          {shouldPlayDetectionAnimation ? (
            <motion.div
              key={detectionAnimationCycle}
              className="ll:pointer-events-none ll:absolute ll:inset-0 ll:rounded-[inherit]"
              style={{
                background: repeatDetectionFlashFrames.overlayBackground,
                boxShadow: repeatDetectionFlashFrames.glowShadow,
              }}
              initial={{
                opacity: 0,
                scale: 0.96,
                filter: "brightness(1)",
              }}
              animate={{
                opacity: [0, 0.72, 0.5, 0],
                scale: [0.96, 1.01, 1.003, 1],
                filter: [
                  "brightness(1)",
                  "brightness(1.28)",
                  "brightness(1.12)",
                  "brightness(1)",
                ],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.82,
                times: [0, 0.18, 0.58, 1],
                ease: "easeOut",
              }}
            />
          ) : null}
        </AnimatePresence>
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
                              transitionDuration: `${BUTTON_UNLOCK_DELAY_MS}ms`,
                            }}
                          />
                        </svg>
                      ) : null}
                      <span className="ll:relative ll:text-[10px] ll:font-semibold ll:tabular-nums">
                        {messageButtonCooldownSecondsLeft ||
                          Math.ceil(BUTTON_UNLOCK_DELAY_MS / 1000)}
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
        {npcs.length > 1 && (
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

  if (!animationEffectsEnabled) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      animate={
        shouldPlayDetectionAnimation
          ? {
              y: [-6, 0, 0],
              scale: [0.988, 1.006, 1],
            }
          : undefined
      }
      transition={{
        duration: 0.34,
        times: [0, 0.45, 1],
        ease: "easeOut",
      }}
    >
      {content}
    </motion.div>
  );
};
