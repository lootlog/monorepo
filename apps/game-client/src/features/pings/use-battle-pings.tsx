import { useSocket } from "@/contexts/socket-context";
import { readSettingsValue } from "@/lib/settings-persistence/settings-snapshot";
import { useAccountEnabledFlag } from "@/lib/settings-persistence/use-account-enabled-flag";
import { isWarriorDead } from "@/hooks/game-events/helpers/battle.helpers";
import { playSound } from "@/lib/sound-playback";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { normalizeBattlePings } from "@lootlog/domain/account-preferences";
import {
  isBattleEnemyPingType,
  isBattlePingType,
  isBattleTeamPingType,
  type BattlePingEvent,
  type BattlePingType,
} from "@lootlog/schema/battle-ping";
import type { MapPingAck } from "@lootlog/schema/map-ping";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isQuickFightButton } from "./battle-controls";
import { battlePingStore } from "./battle-ping-store";
import {
  getBattleTeamCharacterIds,
  getBattleWarrior,
  getBattleWarriorId,
  getBattleWarriorRole,
  resolveBattleWarriorElement,
} from "./battle-warriors";
import type {
  PingInteractionStart,
  PingMenu,
} from "./ping-interaction-controller";
import {
  BATTLE_ENEMY_RING_TYPES,
  BATTLE_QUICK_FIGHT_TYPE,
  BATTLE_SELF_RING_TYPES,
  PING_REQUEST_FOR_ME_PLAYBACK_RATE,
  getBattleProfessionRequests,
  getPingPresentation,
} from "./ping-presentation";
import { useRejectedPingHint, type PingPointer } from "./use-map-pings";

const ACK_TIMEOUT_MS = 1_500;

const QUICK_FIGHT_MENU: PingMenu = {
  centre: null,
  quick: BATTLE_QUICK_FIGHT_TYPE,
  ring: [BATTLE_QUICK_FIGHT_TYPE],
  title: null,
};

const areBattlePingsEnabled = () =>
  Boolean(useGameStore.getState().game?.hero.accountId) &&
  normalizeBattlePings(readSettingsValue("gameData.battlePings")).enabled;

const readBattleContext = () => {
  const game = useGameStore.getState().game;
  const { battleState, battleWarriors } = useBattleStore.getState();

  if (!game || game.interface !== "ni" || battleState !== "in-battle") {
    return null;
  }

  return { game, heroId: game.hero.characterId, warriors: battleWarriors };
};

type BattleContext = NonNullable<ReturnType<typeof readBattleContext>>;

const canPingWarrior = (
  context: BattleContext,
  senderCharacterId: string,
  warriorId: number,
  type: BattlePingType,
) => {
  const warrior = getBattleWarrior(context.warriors, warriorId);
  const hero = getBattleWarrior(context.warriors, Number(context.heroId));

  if (!warrior || !hero || isWarriorDead(warrior)) {
    return false;
  }

  if (isBattleTeamPingType(type)) {
    return String(warriorId) === senderCharacterId;
  }

  if (isBattleEnemyPingType(type)) {
    return warrior.team !== hero.team;
  }

  if (warrior.team !== hero.team) {
    return false;
  }

  if (String(warriorId) === senderCharacterId) {
    return BATTLE_SELF_RING_TYPES.some((selfType) => selfType === type);
  }

  return getBattleProfessionRequests(warrior.prof).includes(type);
};

const playPingSound = (type: BattlePingType, forMe: boolean) => {
  playSound("pings", "mapPing", {
    playbackRate: forMe
      ? PING_REQUEST_FOR_ME_PLAYBACK_RATE
      : getPingPresentation(type).playbackRate,
    preservesPitch: false,
  });
};

export const useBattlePings = () => {
  const { socket, connected, joined } = useSocket();

  const isNewInterface = useGameStore(
    (state) => state.game?.interface === "ni",
  );

  const enabled = useAccountEnabledFlag("battlePings").data?.enabled ?? false;
  const online = enabled && isNewInterface && connected && joined;
  const showHint = useRejectedPingHint();
  const { t } = useTranslation("pings");

  useEffect(() => {
    if (!online) {
      battlePingStore.clear();

      return;
    }

    return useBattleStore.subscribe((state, previous) => {
      if (state.battleState !== "in-battle") {
        battlePingStore.clear();

        return;
      }

      if (state.battleWarriors === previous.battleWarriors) {
        return;
      }

      const { marks, target } = battlePingStore.getSnapshot();
      const pinged = [...marks.keys(), ...(target ? [target.warriorId] : [])];

      for (const warriorId of pinged) {
        const warrior = getBattleWarrior(state.battleWarriors, warriorId);

        if (!warrior || isWarriorDead(warrior)) {
          battlePingStore.removeWarrior(warriorId);
        }
      }
    });
  }, [online]);

  useEffect(() => {
    if (!online || !socket) {
      return;
    }

    const handleBattlePing = (event: BattlePingEvent) => {
      const context = readBattleContext();

      if (
        !context ||
        !areBattlePingsEnabled() ||
        !isBattlePingType(event.type) ||
        event.world !== context.game.world ||
        event.mapId !== context.game.map.id ||
        !getBattleTeamCharacterIds(context.warriors, context.heroId).includes(
          event.sender.characterId,
        ) ||
        !canPingWarrior(
          context,
          event.sender.characterId,
          event.warriorId,
          event.type,
        )
      ) {
        return;
      }

      const forMe =
        isBattleTeamPingType(event.type) ||
        (String(event.warriorId) === context.heroId &&
          !isBattleEnemyPingType(event.type));

      battlePingStore.apply({
        forMe,
        senderName: event.sender.name,
        type: event.type,
        warriorId: event.warriorId,
      });
      playPingSound(event.type, forMe);
    };

    socket.on("battle-ping.received", handleBattlePing);

    return () => {
      socket.off("battle-ping.received", handleBattlePing);
    };
  }, [online, socket]);

  const getMenu = (warriorId: number): PingMenu | null => {
    const context = readBattleContext();

    if (!context) {
      return null;
    }

    const warrior = getBattleWarrior(context.warriors, warriorId);

    const role = getBattleWarriorRole(
      context.warriors,
      context.heroId,
      warriorId,
    );

    if (!warrior || !role || isWarriorDead(warrior)) {
      return null;
    }

    const title = warrior.prof
      ? t("wheel.warriorTitle", {
          name: warrior.name,
          profession: t(`onlinePlayers:professions.${warrior.prof}`, {
            defaultValue: warrior.prof,
          }),
        })
      : warrior.name;

    if (role === "enemy") {
      return {
        centre: null,
        quick: "attack",
        ring: BATTLE_ENEMY_RING_TYPES,
        title,
      };
    }

    const ring =
      role === "self"
        ? BATTLE_SELF_RING_TYPES
        : getBattleProfessionRequests(warrior.prof);

    return ring.length > 0 ? { centre: null, quick: null, ring, title } : null;
  };

  const resolveStart = (
    pointer: PingPointer,
  ): Omit<PingInteractionStart, "identity"> | null => {
    if (
      !isNewInterface ||
      !socket ||
      !connected ||
      !joined ||
      !areBattlePingsEnabled()
    ) {
      return null;
    }

    if (isQuickFightButton(pointer.target)) {
      const heroId = readBattleContext()?.heroId;

      return heroId === undefined
        ? null
        : {
            menu: QUICK_FIGHT_MENU,
            origin: { x: pointer.x, y: pointer.y },
            target: { kind: "battle", warriorId: Number(heroId) },
          };
    }

    const element = resolveBattleWarriorElement(pointer.target);
    const warriorId = element ? getBattleWarriorId(element) : null;
    const menu = warriorId === null ? null : getMenu(warriorId);

    if (warriorId === null || !menu) {
      return null;
    }

    return {
      menu,
      origin: { x: pointer.x, y: pointer.y },
      target: { kind: "battle", warriorId },
    };
  };

  const send = (warriorId: number, type: BattlePingType) => {
    const context = readBattleContext();

    if (
      !context ||
      !socket ||
      !canPingWarrior(context, context.heroId, warriorId, type)
    ) {
      return;
    }

    const senderName = context.game.hero.name;
    const previousTarget = battlePingStore.getSnapshot().target;

    const entryId = battlePingStore.apply({
      forMe: false,
      senderName,
      type,
      warriorId,
    });

    playPingSound(type, false);

    const recipientCharacterIds = getBattleTeamCharacterIds(
      context.warriors,
      context.heroId,
    );

    if (recipientCharacterIds.length === 0) return;

    const retract = (acknowledgement?: MapPingAck) => {
      battlePingStore.retract(entryId, previousTarget);

      if (acknowledgement?.status === "rejected") showHint(acknowledgement);
    };

    socket
      .request(
        "battle-ping.send",
        {
          expectedMapId: context.game.map.id,
          recipientCharacterIds,
          type,
          warriorId,
        },
        ACK_TIMEOUT_MS,
      )
      .then(
        (acknowledgement) => {
          if (acknowledgement.status !== "accepted") retract(acknowledgement);
        },
        () => retract(),
      )
      .catch(() => undefined);
  };

  return { active: online, resolveStart, send };
};
