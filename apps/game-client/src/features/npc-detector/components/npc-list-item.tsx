import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { resolveDetectorGuildIds } from "@/lib/game-account-notification-preferences";
import { cn } from "@/lib/utils";
import type { DetectorNpcType } from "@lootlog/types";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { getNpcTypeByWt } from "@lootlog/types";
import {
  AlertTriangle,
  Check,
  Loader2,
  Megaphone,
  Users,
  XIcon,
} from "lucide-react";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import {
  getBackgroundColor,
  getBorderColor,
} from "@/utils/notifications-and-detector/background";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";
import { useEffect, useMemo, useState } from "react";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { useSession } from "@/hooks/auth/use-session";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";

const BUTTON_UNLOCK_DELAY_MS = 5000;
const REPEAT_DETECTION_FLASH_DURATION_MS = 1050;

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
  const { npcs, removeNpc, setNpcState, clearDetectionAnimation } =
    useNpcDetectorStore();
  const { settings } = useCurrentGameAccountDetectorSettings();
  const {
    setNotification,
    partyGathering,
    setPartyGathering,
    setChatMessageId,
  } = usePartyFinderStore();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;
  const world = Game.getWorldName();
  const { mutate: sendChatMessage, mutateAsync: sendChatMessageAsync } =
    useSendChatMessage();
  const {
    mutate: createNotification,
    mutateAsync: createNotificationAsync,
    isPending: isCreateNotificationPending,
  } = useCreateNotification();
  const [isGatheringPartyPending, setIsGatheringPartyPending] = useState(false);

  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
  const settingsByNpcType = settings[npcType as DetectorNpcType];
  const resolvedGuildIds = useMemo(
    () => resolveDetectorGuildIds(settings.routingRules, npc.lvl),
    [npc.lvl, settings.routingRules],
  );
  const key = npcType;
  const repeatDetectionFlashFrames = getRepeatDetectionFlashFrames(key);

  const hasActivePartyGathering = partyGathering !== null;

  useEffect(() => {
    if (!npc.notificationSent) return;

    const timer = setTimeout(() => {
      setNpcState(npc.id, { ...npc, notificationSent: false });
    }, BUTTON_UNLOCK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [npc.notificationSent]);

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

  const handleSendNotification = (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      window.message("Brak pasujacych serwerow dla poziomu tego potwora.");
      return;
    }

    if (!npc || !world) return;

    const payload = {
      npc: {
        id: npc.id,
        hpp: 0,
        location: npc.location,
        name: npc.nick,
        wt: npc.wt,
        x: npc.x,
        y: npc.y,
        lvl: npc.lvl,
        prof: npc.prof,
        icon: npc.icon,
        type: npc.type,
      },
      world: world,
      guildIds: resolvedGuildIds,
    };

    createNotification(payload, {
      onSuccess: (response) => {
        setNpcState(npc.id, {
          ...npc,
          notificationSent: true,
        });

        setNotification(response.data.notificationId, {
          id: npc.id,
          name: npc.nick,
          lvl: npc.lvl,
          prof: npc.prof,
          location: npc.location,
          world: world,
          icon: npc.icon,
          x: npc.x,
          y: npc.y,
        });

        sendChatMessage({
          message: "",
          guildIds: resolvedGuildIds,
          type: MessageType.NPC,
          characterData: {
            nick: Game.hero.nick,
            id: Game.hero.id,
            acc: Game.hero.account,
            lvl: Game.hero.lvl,
            prof: Game.hero.prof,
            icon: Game.hero.img,
          },
          npc: {
            x: npc.x,
            y: npc.y,
            icon: npc.icon,
            id: npc.id,
            name: npc.nick,
            hpp: 0,
            location: npc.location,
            lvl: npc.lvl,
            prof: npc.prof,
            type: npc.type,
            wt: npc.wt,
          },
        });

        setOpen("party-finder", true);
      },
    });
  };

  const handleGatherParty = async (npc: GameNpcWithLocation) => {
    if (resolvedGuildIds.length === 0) {
      window.message("Brak pasujacych serwerow dla poziomu tego potwora.");
      return;
    }

    if (!npc || !world || !discordId) return;

    setIsGatheringPartyPending(true);

    try {
      const payload = {
        npc: {
          id: npc.id,
          hpp: 0,
          location: npc.location,
          name: npc.nick,
          wt: npc.wt,
          x: npc.x,
          y: npc.y,
          lvl: npc.lvl,
          prof: npc.prof,
          icon: npc.icon,
          type: npc.type,
        },
        world: world,
        guildIds: resolvedGuildIds,
        isGatheringParty: true,
      };

      const notificationResponse = await createNotificationAsync(payload);

      const notificationId = notificationResponse.data.notificationId;
      const guildIds = notificationResponse.data.guildIds ?? resolvedGuildIds;
      const hero = Game.hero;

      setNotification(notificationId, {
        id: npc.id,
        name: npc.nick,
        lvl: npc.lvl,
        prof: npc.prof,
        location: npc.location,
        world: world,
        icon: npc.icon,
        x: npc.x,
        y: npc.y,
      });

      setPartyGathering({
        notificationId,
        discordId,
        character: {
          nick: hero.nick,
          lvl: hero.lvl,
          prof: hero.prof,
          characterId: String(hero.id),
          accountId: String(hero.account),
          icon: hero.img,
          clan: hero.clan
            ? { id: hero.clan.id, name: hero.clan.name }
            : undefined,
        },
        world,
        createdAt: new Date().toISOString(),
        guildIds,
      });

      const chatResults = await sendChatMessageAsync({
        message: `${npc.nick} (${npc.lvl}${npc.prof ?? ""})`,
        guildIds,
        type: MessageType.PARTY_GATHERING,
        characterData: {
          nick: hero.nick,
          id: hero.id,
          acc: hero.account,
          lvl: hero.lvl,
          prof: hero.prof,
          icon: hero.img,
        },
        npc: {
          x: npc.x,
          y: npc.y,
          icon: npc.icon,
          id: npc.id,
          name: npc.nick,
          hpp: 0,
          location: npc.location,
          lvl: npc.lvl,
          prof: npc.prof,
          type: npc.type,
          wt: npc.wt,
        },
        partyGathering: {
          notificationId,
          discordId,
          world,
        },
      });

      chatResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.data?.id) {
          setChatMessageId(guildIds[index], result.value.data.id);
        }
      });

      setNpcState(npc.id, {
        ...npc,
        notificationSent: true,
      });

      setOpen("party-finder", true);
    } catch (error) {
      console.error("Failed to gather party:", error);
      window.message("Nie udało się rozpocząć zbierania grupy");
    } finally {
      setIsGatheringPartyPending(false);
    }
  };

  const background = getBackgroundColor(key, settingsByNpcType?.highlight);
  const borderColor = getBorderColor(key, settingsByNpcType?.highlight);

  return (
    <motion.div
      className={cn(
        "ll:relative ll:overflow-hidden ll:flex ll:items-center ll:py-1 ll:gap-2 ll:px-2",
        "ll:border ll:rounded-sm",
        "ll:transition-[background-color] ll:duration-300",
      )}
      style={{ background, borderColor }}
      animate={
        detectionAnimationCycle === null
          ? undefined
          : {
              y: [-6, 0, 0],
              scale: [0.988, 1.006, 1],
            }
      }
      transition={{
        duration: 0.34,
        times: [0, 0.45, 1],
        ease: "easeOut",
      }}
    >
      <AnimatePresence mode="wait">
        {detectionAnimationCycle !== null ? (
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
                className="ll:size-7 ll:px-0 ll:bg-yellow-500/10 ll:hover:bg-yellow-500/18 ll:border-yellow-500/40"
                onClick={handleOpenDetectorSettings}
                aria-label="Otwórz ustawienia wykrywacza"
              >
                <AlertTriangle
                  className="ll:stroke-yellow-500 ll:opacity-80"
                  size={14}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Brak pasujacych serwerow dla poziomu tego potwora.
            </TooltipContent>
          </Tooltip>
        )}
        {resolvedGuildIds.length > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="ll:size-7 ll:px-0"
                  disabled={isCreateNotificationPending || npc.notificationSent}
                  onClick={() => handleSendNotification(npc)}
                >
                  {npc.notificationSent ? (
                    <Check size={12} />
                  ) : (
                    <Megaphone size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {npc.notificationSent ? "Wysłano" : "Komunikat"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="ll:size-7 ll:px-0"
                  disabled={isGatheringPartyPending || hasActivePartyGathering}
                  onClick={() => handleGatherParty(npc)}
                >
                  {isGatheringPartyPending ? (
                    <Loader2 size={12} className="ll:animate-spin" />
                  ) : (
                    <Users size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isGatheringPartyPending
                  ? "Zbieranie grupy..."
                  : hasActivePartyGathering
                    ? "Już zbierasz grupę"
                    : "Zbierz grupę"}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      {npcs.length > 1 && (
        <XIcon
          className="ll:relative ll-custom-cursor-pointer ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
          size={14}
          onClick={() => handleRemoveNpc(npc.id)}
        />
      )}
    </motion.div>
  );
};
