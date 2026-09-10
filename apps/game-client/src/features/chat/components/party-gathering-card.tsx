import {
  type ChatMessageResponseDtoOutput,
  type MemberSummaryResponseDtoOutput,
  usePartyReadyRoomControllerApply,
} from "@lootlog/client/main";

import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { useMemberColor } from "@/hooks/discord/use-member-color";

import { cn } from "cn";
import { useGameStore } from "@/store/game.store";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { format } from "@/utils/local-date";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  selectReadyRoomForCharacter,
  selectReadyRoomParticipantForCharacter,
  usePartyFinderStore,
  type ReadyRoomCharacterIdentity,
} from "@/store/party-finder.store";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { ChatCharacterTooltip } from "./chat-character-tooltip";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import type { TFunction } from "i18next";

type PartyGatheringCardProps = {
  message: ChatMessageResponseDtoOutput;
  member?: MemberSummaryResponseDtoOutput;
  guildName: string;
  all: boolean;
  isMsgYesterday: boolean;
  showGuildLabel?: boolean;
  showTimestamp?: boolean;
};

const resolveSenderName = (
  member: MemberSummaryResponseDtoOutput | undefined,
  message: ChatMessageResponseDtoOutput,
  fallback: string,
): string => member?.name ?? message.characterData?.nick ?? fallback;

const resolveVolunteerLabel = (params: {
  isPending: boolean;
  meetsLevelRequirement: boolean;
  status: "applied" | "inParty" | undefined;
  isRegisteredElsewhere: boolean;
  minLvl: number;
  maxLvl: number;
  t: TFunction<"chat">;
}) => {
  if (params.isPending) return params.t("partyGathering.volunteering");
  if (!params.meetsLevelRequirement) {
    return params.t("partyGathering.requiredLevel", {
      min: params.minLvl,
      max: params.maxLvl,
    });
  }
  if (params.status) {
    return params.t(
      params.status === "inParty"
        ? "gatherings.inParty"
        : "partyGathering.joined",
    );
  }
  if (params.isRegisteredElsewhere) {
    return params.t("partyGathering.joinedElsewhere");
  }
  return params.t("partyGathering.joinParty");
};

const hasLevelRange = (
  partyGathering: NonNullable<ChatMessageResponseDtoOutput["partyGathering"]>,
): boolean =>
  partyGathering.minLvl !== undefined || partyGathering.maxLvl !== undefined;

const isVolunteerDisabled = (
  isPending: boolean,
  meetsLevelRequirement: boolean,
  hasCurrentReadyRoom: boolean,
): boolean => isPending || !meetsLevelRequirement || hasCurrentReadyRoom;

const getPartyGatheringCardState = (
  partyGathering: ChatMessageResponseDtoOutput["partyGathering"],
  heroLevel: number,
  showGuildLabel: boolean | undefined,
  showTimestamp: boolean | undefined,
) => {
  const minLvl = partyGathering?.minLvl ?? 1;
  const maxLvl = partyGathering?.maxLvl ?? 500;
  return {
    showGuildLabel: showGuildLabel ?? true,
    showTimestamp: showTimestamp ?? true,
    minLvl,
    maxLvl,
    meetsLevelRequirement: heroLevel >= minLvl && heroLevel <= maxLvl,
  };
};

const getParticipationStatus = (
  room: PartyReadyRoomProjection | null,
  notificationId: string,
  identity: ReadyRoomCharacterIdentity | null,
) => {
  if (
    room?.viewer !== "PARTICIPANT" ||
    room.notificationId !== notificationId
  ) {
    return undefined;
  }
  const participant = selectReadyRoomParticipantForCharacter(room, identity);
  return participant?.partyPresence === "IN_PARTY" ? "inParty" : "applied";
};

export const PartyGatheringCard: FC<PartyGatheringCardProps> = (props) => {
  const { message, member, guildName, all, isMsgYesterday } = props;
  const { t } = useTranslation("chat");
  const memberColor = useMemberColor(member);
  const applyToReadyRoom = usePartyReadyRoomControllerApply();
  const notificationId = message.partyGathering?.notificationId;
  const [signupState, setSignupState] = useState({
    notificationId,
    failed: false,
  });
  if (signupState.notificationId !== notificationId) {
    setSignupState({ notificationId, failed: false });
  }
  const world = useGameStore((state) => state.game?.world);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const currentReadyRoom = usePartyFinderStore((state) =>
    selectReadyRoomForCharacter(state, currentCharacterIdentity),
  );
  const senderName = resolveSenderName(
    member,
    message,
    t("contextMenu.unknownUser"),
  );

  const heroLvl = useGameStore((state) => state.game?.hero.level ?? 0);
  const heroAccountId = useGameStore(
    (state) => state.game?.hero.accountId ?? "",
  );
  const heroCharacterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const isOrganizingCharacter =
    String(message.characterData.acc) === heroAccountId &&
    String(message.characterData.id) === heroCharacterId;
  const partyGathering = message.partyGathering;
  const {
    showGuildLabel,
    showTimestamp,
    minLvl,
    maxLvl,
    meetsLevelRequirement: meetsLevelReq,
  } = getPartyGatheringCardState(
    partyGathering,
    heroLvl,
    props.showGuildLabel,
    props.showTimestamp,
  );

  const messageAuthor = (
    <>
      {showTimestamp ? (
        <span
          className={cn(
            "ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)] ll:select-text",
            {
              "ll:opacity-50": isMsgYesterday,
            },
          )}
        >
          [{format(new Date(message.timestamp), "HH:mm")}]
        </span>
      ) : null}{" "}
      {all && showGuildLabel && (
        <span
          className={cn("ll:font-bold ll:mr-0.5 ll:select-text", {
            "ll:opacity-50": isMsgYesterday,
          })}
        >
          [{guildName}]{" "}
        </span>
      )}
      <ChatCharacterTooltip character={message.characterData}>
        <span
          className="ll:font-bold ll:select-text"
          style={{ color: `#${memberColor}` }}
        >
          {senderName}:
        </span>
      </ChatCharacterTooltip>{" "}
    </>
  );

  if (!partyGathering) {
    return (
      <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-center ll:gap-[var(--ll-chat-space-sm)] ll:text-white ll:text-[length:var(--ll-chat-font-size)] ll:leading-[var(--ll-chat-line-height)] ll:select-text ll:cursor-text">
        <span
          className="ll:inline-block ll:max-w-full ll:select-text"
          style={{ overflowWrap: "anywhere" }}
        >
          {messageAuthor}
          <span className="ll:font-normal ll:text-gray-400 ll:select-text">
            {t("partyGathering.ended")}
          </span>
        </span>
      </div>
    );
  }

  const handleVolunteer = () => {
    const game = useGameStore.getState().game;
    if (
      applyToReadyRoom.isPending ||
      isOrganizingCharacter ||
      game?.world !== partyGathering.world ||
      game.hero.level < minLvl ||
      game.hero.level > maxLvl ||
      selectReadyRoomForCharacter(
        usePartyFinderStore.getState(),
        getCurrentReadyRoomCharacterIdentity(),
      )
    )
      return;
    const character = buildCurrentCharacterPayload();
    if (!character) return;
    setSignupState({ notificationId, failed: false });

    applyToReadyRoom.mutate(
      {
        pathParams: {
          notificationId: partyGathering.notificationId,
        },
        data: {
          world: partyGathering.world,
          character,
        },
      },
      {
        onError: () => setSignupState({ notificationId, failed: true }),
        onSuccess: (projection) => {
          setSignupState({ notificationId, failed: false });
          if (projection.schemaVersion !== 3) return;
          mergeProjection(decodePartyReadyRoomProjection(projection));
        },
      },
    );
  };

  const participationStatus = getParticipationStatus(
    currentReadyRoom,
    partyGathering.notificationId,
    currentCharacterIdentity,
  );
  const isRegisteredElsewhere =
    currentReadyRoom !== null && participationStatus === undefined;
  const volunteerLabel = resolveVolunteerLabel({
    isPending: applyToReadyRoom.isPending,
    meetsLevelRequirement: meetsLevelReq,
    status: participationStatus,
    isRegisteredElsewhere,
    minLvl,
    maxLvl,
    t,
  });

  return (
    <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:font-normal ll:text-white ll:text-[length:var(--ll-chat-font-size)] ll:leading-[var(--ll-chat-line-height)] ll:select-text ll:cursor-text">
      <div className="ll:flex ll:min-w-0 ll:max-w-full ll:items-center ll:gap-[var(--ll-chat-space-sm)] ll:pr-1">
        <span className="ll:min-w-0 ll:flex-1 ll:[overflow-wrap:anywhere]">
          {messageAuthor}
          {t("partyGathering.title")}
        </span>
        {!isOrganizingCharacter && (
          <ChatGatheringJoinButton
            pending={applyToReadyRoom.isPending}
            disabled={
              world !== partyGathering.world ||
              isVolunteerDisabled(
                applyToReadyRoom.isPending,
                meetsLevelReq,
                currentReadyRoom !== null,
              )
            }
            status={participationStatus}
            label={
              world !== partyGathering.world
                ? t("partyGathering.otherWorld")
                : volunteerLabel
            }
            onClick={handleVolunteer}
          />
        )}
      </div>
      {message.npc && (
        <p className="ll:m-0 ll:[overflow-wrap:anywhere] ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)] ll:text-gray-100">
          {message.npc.name} ({message.npc.lvl}
          {message.npc.prof ?? ""})
        </p>
      )}
      {partyGathering.description && (
        <p className="ll:m-0 ll:[overflow-wrap:anywhere] ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)] ll:text-gray-300">
          {partyGathering.description}
        </p>
      )}
      {hasLevelRange(partyGathering) && (
        <p className="ll:m-0 ll:w-full ll:min-w-0 ll:max-w-full ll:break-words ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:text-gray-400">
          {t("partyGathering.levelRange", {
            min: minLvl,
            max: maxLvl,
          })}
        </p>
      )}
      {signupState.failed && (
        <p
          role="alert"
          className="ll:m-0 ll:[overflow-wrap:anywhere] ll:text-red-300 ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)]"
        >
          {t("partyGathering.joinFailed")}
        </p>
      )}
    </div>
  );
};
