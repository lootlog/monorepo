import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { cn } from "@/lib/utils";
import {
  usePartyFinderStore,
  type PartyFinderVolunteer,
} from "@/store/party-finder.store";
import { useFriendsStore } from "@/store/friends.store";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
} from "@/utils/game/character-actions";
import { Loader2, Plus, RotateCcw, UserPlus, X } from "lucide-react";
import { useEffect, type FC } from "react";

type VolunteersListItemProps = {
  volunteer: PartyFinderVolunteer;
};

export const VolunteersListItem: FC<VolunteersListItemProps> = ({
  volunteer,
}) => {
  const removeVolunteer = usePartyFinderStore((s) => s.removeVolunteer);
  const partyGathering = usePartyFinderStore((s) => s.partyGathering);
  const inviteState = usePartyFinderStore(
    (s) => s.inviteStates[volunteer.characterId],
  );
  const setInviteState = usePartyFinderStore((s) => s.setInviteState);
  const clearInviteState = usePartyFinderStore((s) => s.clearInviteState);
  const isFriend = useFriendsStore((s) => s.isFriend);

  useEffect(() => {
    if (inviteState !== "pending") return;

    const timeout = setTimeout(() => {
      setInviteState(volunteer.characterId, "failed");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [inviteState, volunteer.characterId, setInviteState]);

  const handleInviteToParty = () => {
    setInviteState(volunteer.characterId, "pending");
    inviteCharacterToParty(volunteer.characterId);
  };

  const handleRemove = () => {
    clearInviteState(volunteer.characterId);
    removeVolunteer(volunteer.characterId);
  };

  const handleAddFriend = () => {
    inviteCharacterToFriends(volunteer.nick);
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
      className={cn(
        "ll:px-1 ll:flex ll:flex-row ll:mb-0.5 ll:justify-between",
        shouldHighlight && "ll:border-green-500",
      )}
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
        {inviteState === "pending" ? (
          <Button className="ll:p-0" disabled>
            <Loader2 size="18" className="ll:text-yellow-500 ll:animate-spin" />
          </Button>
        ) : inviteState === "failed" ? (
          <Button className="ll:p-0" onClick={handleInviteToParty}>
            <RotateCcw size="18" className="ll:text-orange-400" />
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
