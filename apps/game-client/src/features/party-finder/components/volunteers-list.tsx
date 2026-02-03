import { VolunteersListItem } from "@/features/party-finder/components/volunteers-list-item";
import { usePartyFinderStore } from "@/store/party-finder.store";
import type { FC } from "react";

export const VolunteersList: FC = () => {
  const volunteers = usePartyFinderStore((s) => s.volunteers);

  if (volunteers.length === 0) {
    return (
      <div className="ll:text-center ll:text-gray-400 ll:text-[11px] ll:py-2">
        Oczekiwanie na wolontariuszy...
      </div>
    );
  }

  return (
    <ul>
      {volunteers.map((v) => (
        <VolunteersListItem key={v.characterId} volunteer={v} />
      ))}
    </ul>
  );
};
