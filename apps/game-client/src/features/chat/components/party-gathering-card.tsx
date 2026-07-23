import type { ChatMessageResponseDtoOutput } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { usePartyReadyRoomControllerApply } from "@lootlog/api-client/react-query/main/party-ready-room";
import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game.store";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { format } from "@/utils/local-date";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  selectReadyRoomForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { ChatCharacterTooltip } from "./chat-character-tooltip";

type PartyGatheringCardProps = {
  message: ChatMessageResponseDtoOutput;
  member?: MemberSummaryResponseDtoOutput;
  guildName: string;
  all: boolean;
  isMsgYesterday: boolean;
};

export const PartyGatheringCard: FC<PartyGatheringCardProps> = ({
  message,
  member,
  guildName,
  all,
  isMsgYesterday,
}) => {
  const { t } = useTranslation("chat");
  const memberColor = useMemberColor(member);
  const applyToReadyRoom = usePartyReadyRoomControllerApply();
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const currentReadyRoom = usePartyFinderStore((state) =>
    selectReadyRoomForCharacter(state, currentCharacterIdentity),
  );
  const senderName =
    member?.name ?? message.characterData?.nick ?? t("contextMenu.unknownUser");

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

  if (!partyGathering) {
    return (
      <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-center ll:gap-1 ll:text-white ll:text-xs ll:select-text ll:cursor-text">
        <span
          className="ll:inline-block ll:max-w-full ll:select-text"
          style={{ overflowWrap: "anywhere" }}
        >
          <span
            className={cn("ll:text-[11px] ll:select-text", {
              "ll:opacity-50": isMsgYesterday,
            })}
          >
            [{format(new Date(message.timestamp), "HH:mm")}]
          </span>{" "}
          {all && (
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
          <span
            className="ll:font-bold ll:select-text"
            style={{ color: "#9CA3AF" }}
          >
            [G] {message.message}
          </span>
        </span>
      </div>
    );
  }

  const handleVolunteer = () => {
    const character = buildCurrentCharacterPayload();
    if (!character) return;

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
        onSuccess: (projection) => {
          mergeProjection(projection as unknown as PartyReadyRoomProjection);
        },
      },
    );
  };

  return (
    <div className="ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:text-white ll:text-xs ll:select-text ll:cursor-text">
      <div
        className="ll:mb-0.5 ll:min-w-0 ll:max-w-full"
        style={{ overflowWrap: "anywhere" }}
      >
        <span
          className={cn("ll:text-[11px] ll:select-text", {
            "ll:opacity-50": isMsgYesterday,
          })}
        >
          [{format(new Date(message.timestamp), "HH:mm")}]
        </span>{" "}
        {all && (
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
        <span
          className="ll:font-bold ll:select-text"
          style={{ color: "#FF8C00" }}
        >
          [G]
        </span>
      </div>
      <div
        className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:flex-col ll:items-stretch ll:gap-1 ll:overflow-hidden ll:rounded-sm ll:border-l-2 ll:border-solid ll:bg-gray-500/30 ll:px-2 ll:py-1.5"
        style={{ borderColor: "#FF8C00" }}
      >
        <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-center ll:gap-1.5 ll:overflow-hidden">
          <CharacterTile
            character={message.characterData}
            className="ll:shrink-0 ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-1"
          />
          <span className="ll:flex-1 ll:min-w-0 ll:max-w-full ll:truncate ll:font-bold ll:text-[11px] ll:text-white">
            {message.characterData.nick} ({message.characterData.lvl}
            {message.characterData.prof})
          </span>
        </div>
        {message.npc && (
          <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-center ll:gap-1.5 ll:overflow-hidden">
            <span className="ll:flex-1 ll:min-w-0 ll:max-w-full ll:truncate ll:text-[11px] ll:text-amber-300 ll:font-semibold">
              {message.npc.name} ({message.npc.lvl}
              {message.npc.prof ?? ""})
            </span>
          </div>
        )}
        {partyGathering?.description && (
          <p className="ll:w-full ll:min-w-0 ll:max-w-full ll:break-words ll:text-[11px] ll:text-gray-300 ll:italic">
            &quot;{partyGathering.description}&quot;
          </p>
        )}
        {(partyGathering?.minLvl ?? partyGathering?.maxLvl) && (
          <p className="ll:w-full ll:min-w-0 ll:max-w-full ll:break-words ll:text-[10px] ll:text-gray-400">
            {t("partyGathering.levelRange", {
              min: partyGathering?.minLvl ?? 1,
              max: partyGathering?.maxLvl ?? 500,
            })}
          </p>
        )}
        {!isOrganizingCharacter &&
          (() => {
            const minLvl = partyGathering?.minLvl ?? 1;
            const maxLvl = partyGathering?.maxLvl ?? 500;
            const meetsLevelReq = heroLvl >= minLvl && heroLvl <= maxLvl;
            const isJoinedToThisGathering =
              currentReadyRoom?.viewer === "PARTICIPANT" &&
              currentReadyRoom.notificationId === partyGathering.notificationId;
            const isRegisteredElsewhere =
              currentReadyRoom !== null && !isJoinedToThisGathering;

            return (
              <Button
                onClick={handleVolunteer}
                disabled={
                  applyToReadyRoom.isPending ||
                  !meetsLevelReq ||
                  currentReadyRoom !== null
                }
                className="ll:box-border ll:w-full ll:min-w-0 ll:max-w-full ll:mt-0.5 ll:text-[11px] ll:h-6 ll:font-semibold ll:border-[#FF8C00] ll:text-[#FF8C00] ll:hover:bg-[#FF8C00]/20"
              >
                {applyToReadyRoom.isPending ? (
                  <>
                    <Loader2 className="ll:w-3 ll:h-3 ll:animate-spin ll:mr-1" />
                    {t("partyGathering.volunteering")}
                  </>
                ) : !meetsLevelReq ? (
                  t("partyGathering.requiredLevel", {
                    min: minLvl,
                    max: maxLvl,
                  })
                ) : isJoinedToThisGathering ? (
                  t("partyGathering.joined")
                ) : isRegisteredElsewhere ? (
                  t("partyGathering.joinedElsewhere")
                ) : (
                  t("partyGathering.joinParty")
                )}
              </Button>
            );
          })()}
      </div>
    </div>
  );
};
