import type { ChatMessage as ChatMessageType } from "@/hooks/api/use-chat-messages";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { useVolunteer } from "@/hooks/api/use-volunteer";
import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Game } from "@/lib/game";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type PartyGatheringCardProps = {
  message: ChatMessageType;
  member: GuildMember;
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
  const { t } = useTranslation();
  const memberColor = useMemberColor(member);
  const { mutate: volunteer, isPending } = useVolunteer();

  const heroLvl = Game.hero.lvl;
  const isOwnMessage = message.characterData.nick === Game.hero.nick;
  const isEnded = !message.partyGathering;

  if (isEnded) {
    return (
      <div className="ll:text-white ll:text-xs ll:w-full ll:select-text ll:cursor-text ll:flex ll:items-center ll:gap-1">
        <span className="ll:inline-block ll:select-text">
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
            className={cn("ll:font-bold ll:select-text", {
              "ll:opacity-50": isMsgYesterday,
            })}
            style={{ color: `#${memberColor}` }}
          >
            {member.name}:
          </span>{" "}
          <span
            className={cn("ll:font-bold ll:select-text", {
              "ll:opacity-50": isMsgYesterday,
            })}
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
      notificationId: partyGathering!.notificationId,
      targetDiscordId: partyGathering!.discordId,
      world: partyGathering!.world,
    });
  };

  return (
    <div className="ll:text-white ll:text-xs ll:w-full ll:select-text ll:cursor-text">
      <div className="ll:mb-0.5">
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
          {member.name}:
        </span>{" "}
        <span
          className="ll:font-bold ll:select-text"
          style={{ color: "#FF8C00" }}
        >
          [G]
        </span>
      </div>
      <div
        className="ll:px-2 ll:py-1.5 ll:flex ll:flex-col ll:items-start ll:gap-1 ll:border-l-2 ll:border-solid ll:rounded-sm ll:bg-gray-500/30"
        style={{ borderColor: "#FF8C00" }}
      >
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <CharacterTile
            character={message.characterData}
            className="ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-1"
          />
          <span className="ll:font-bold ll:text-[11px] ll:text-white">
            {message.characterData.nick} ({message.characterData.lvl}
            {message.characterData.prof})
          </span>
        </div>
        {message.npc && (
          <div className="ll:flex ll:items-center ll:gap-1.5">
            <span className="ll:text-[11px] ll:text-amber-300 ll:font-semibold">
              {message.npc.name} ({message.npc.lvl}
              {message.npc.prof ?? ""})
            </span>
          </div>
        )}
        {partyGathering?.description && (
          <p className="ll:text-[11px] ll:text-gray-300 ll:italic">
            "{partyGathering.description}"
          </p>
        )}
        {(partyGathering?.minLvl ?? partyGathering?.maxLvl) && (
          <p className="ll:text-[10px] ll:text-gray-400">
            {t("chat.partyGathering.level", {
              minLvl: partyGathering?.minLvl ?? 1,
              maxLvl: partyGathering?.maxLvl ?? 500,
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
                className="ll:w-full ll:mt-0.5 ll:text-[11px] ll:h-6 ll:font-semibold ll:border-[#FF8C00] ll:text-[#FF8C00] ll:hover:bg-[#FF8C00]/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="ll:w-3 ll:h-3 ll:animate-spin ll:mr-1" />
                    {t("chat.partyGathering.volunteering")}
                  </>
                ) : !meetsLevelReq ? (
                  t("chat.partyGathering.requiredLevel", { minLvl, maxLvl })
                ) : (
                  t("chat.partyGathering.join")
                )}
              </Button>
            );
          })()}
      </div>
    </div>
  );
};
