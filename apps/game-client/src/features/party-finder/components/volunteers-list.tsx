import { VolunteersListItem } from "@/features/party-finder/components/volunteers-list-item";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import type { FC } from "react";

export const VolunteersList: FC = () => {
  const volunteers = usePartyFinderStore((s) => s.volunteers);
  const partyMembers = usePartyStore((s) => s.members);

  const visibleVolunteers = volunteers.filter(
    (v) => !partyMembers.some((m) => m.id === Number.parseInt(v.characterId)),
  );

  if (visibleVolunteers.length === 0) {
    return (
      <div className="ll:text-center ll:text-gray-400 ll:text-[11px] ll:py-2">
        Oczekiwanie na graczy...
      </div>
    );
  }

  return (
    <ul className="ll:mt-2">
      {visibleVolunteers.map((v) => (
        <VolunteersListItem key={v.characterId} volunteer={v} />
      ))}
    </ul>
  );
};
