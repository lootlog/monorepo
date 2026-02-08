import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { cn } from "@/lib/utils";
import {
  usePartyFinderStore,
  type PartyFinderVolunteer,
} from "@/store/party-finder.store";
import { useFriendsStore } from "@/store/friends.store";
import { Loader2, Plus, UserPlus, X } from "lucide-react";
import { useEffect, useState, type FC } from "react";

export type VolunteersListItemProps = {
  volunteer: PartyFinderVolunteer;
};

export const VolunteersListItem: FC<VolunteersListItemProps> = ({
  volunteer,
}) => {
  const removeVolunteer = usePartyFinderStore((s) => s.removeVolunteer);
  const partyGathering = usePartyFinderStore((s) => s.partyGathering);
  const isFriend = useFriendsStore((s) => s.isFriend);
  const [invitePending, setInvitePending] = useState(false);

  useEffect(() => {
    if (!invitePending) return;

    const timeout = setTimeout(() => {
      setInvitePending(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [invitePending]);

  const handleInviteToParty = () => {
    setInvitePending(true);
    window._g(`party&a=inv&id=${volunteer.characterId}`);
  };

  const handleRemove = () => {
    removeVolunteer(volunteer.characterId);
  };

  const handleAddFriend = () => {
    const sanitizedNick = volunteer.nick
      .trim()
      .split(" ")
      .join("_")
      .replace(/[&=?#]/g, "");
    window._g(`friends&a=finvite&nick=${sanitizedNick}`);
  };

  const isVolunteerFriend = isFriend(volunteer.characterId);

  const character = {
    id: Number.parseInt(volunteer.characterId),
    nick: volunteer.nick,
    icon: volunteer.icon,
    lvl: volunteer.lvl,
    prof: volunteer.prof,
    world: volunteer.world,
  };

  const isSameClan =
    volunteer.clan?.id !== undefined &&
    partyGathering?.character.clan?.id !== undefined &&
    volunteer.clan.id === partyGathering.character.clan.id;

  const shouldHighlight = isSameClan || isVolunteerFriend;

  return (
    <Tile
      className="ll:px-1 ll:flex ll:flex-row ll:mb-0.5 ll:justify-between"
      customBorderColor={shouldHighlight ? "#22c55e" : undefined}
    >
      <div className="ll:flex ll:items-center">
        <div>
          <CharacterTile
            character={character}
            className="ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-2"
          />
        </div>
        <div
          className={cn(
            "ll:font-semibold ll:text-[11px] ll:min-w-16 ll:max-w-32 ll:whitespace-nowrap ll:truncate",
          )}
        >
          {volunteer.nick} ({volunteer.lvl}
          {volunteer.prof})
        </div>
      </div>
      <div className="ll:flex ll:gap-1">
        {!isVolunteerFriend && !isSameClan && (
          <Button className="ll:p-0" onClick={handleAddFriend}>
            <UserPlus size="18" className="ll:text-blue-500" />
          </Button>
        )}
        {invitePending ? (
          <Button className="ll:p-0" disabled>
            <Loader2 size="18" className="ll:text-yellow-500 ll:animate-spin" />
          </Button>
        ) : (
          <Button className="ll:p-0" onClick={handleInviteToParty}>
            <Plus size="18" className="ll:text-green-500" />
          </Button>
        )}
        <Button className="ll:p-0" onClick={handleRemove}>
          <X size="18" className="ll:text-red-500" />
        </Button>
      </div>
    </Tile>
  );
};
