import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useMessagingControllerVolunteer } from "@/lib/api/generated/main/messaging/messaging";
import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Game } from "@/lib/game";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

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
  const { mutate: volunteer, isPending } = useMessagingControllerVolunteer();
  const senderName =
    member?.name ?? message.characterData?.nick ?? t("contextMenu.unknownUser");

  const heroLvl = Game.hero.lvl;
  const isOwnMessage = message.characterData.nick === Game.hero.nick;
  const isEnded = !message.partyGathering;

  if (isEnded) {
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
          <span
            className="ll:font-bold ll:select-text"
            style={{ color: `#${memberColor}` }}
          >
            {senderName}:
          </span>{" "}
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

  const { partyGathering } = message;

  const handleVolunteer = () => {
    volunteer({
      pathParams: {
        notificationId: partyGathering!.notificationId,
      },
      data: {
        targetDiscordId: partyGathering!.discordId,
        world: partyGathering!.world,
        character: buildCurrentCharacterPayload(),
      },
    });
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
        <span
          className="ll:font-bold ll:select-text"
          style={{ color: `#${memberColor}` }}
        >
          {senderName}:
        </span>{" "}
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
            "{partyGathering.description}"
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
        {!isOwnMessage &&
          (() => {
            const minLvl = partyGathering?.minLvl ?? 1;
            const maxLvl = partyGathering?.maxLvl ?? 500;
            const meetsLevelReq = heroLvl >= minLvl && heroLvl <= maxLvl;

            return (
              <Button
                onClick={handleVolunteer}
                disabled={isPending || !meetsLevelReq}
                className="ll:box-border ll:w-full ll:min-w-0 ll:max-w-full ll:mt-0.5 ll:text-[11px] ll:h-6 ll:font-semibold ll:border-[#FF8C00] ll:text-[#FF8C00] ll:hover:bg-[#FF8C00]/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="ll:w-3 ll:h-3 ll:animate-spin ll:mr-1" />
                    {t("partyGathering.volunteering")}
                  </>
                ) : !meetsLevelReq ? (
                  t("partyGathering.requiredLevel", {
                    min: minLvl,
                    max: maxLvl,
                  })
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
