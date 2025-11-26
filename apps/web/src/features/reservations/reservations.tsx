import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ReservationCard } from "./reservation-card";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useReservations } from "@/hooks/api/reservations/use-reservations";
import { reservationSlug } from "./reservation-slug";
import {
  useReservationsCards,
  type ReservationCard as ReservationCardData,
} from "@/hooks/api/reservations/use-reservations-cards";
import { SearchInput } from "@/components/ui/search-input";

export const Reservations: React.FC = () => {
  const { data: guild } = useGuild({});
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");

  const { data: reservations } = useReservations();
  const { data: reservationsCards } = useReservationsCards();

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredCards = useMemo(() => {
    if (!reservationsCards) {
      return [] as Array<[string, ReservationCardData[]]>;
    }

    const entries = Object.entries(reservationsCards);

    if (!normalizedSearch) {
      return entries;
    }

    return entries.filter(([name]) =>
      name.toLowerCase().includes(normalizedSearch),
    );
  }, [reservationsCards, normalizedSearch]);

  if (!guild || !reservations || !reservationsCards) {
    return null;
  }

  return (
    <div className="space-y-8 p-6 overflow-y-auto h-full">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Szukaj expowiska..."
            className="flex-1"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards
            .flatMap(([name, items]) =>
              items.map((item, idx) => {
                const slug = reservationSlug(name);
                const normalizedKey =
                  slug in reservations
                    ? slug
                    : name in reservations
                      ? name
                      : name.toLowerCase();
                const reservationsForCard =
                  reservations[normalizedKey] ?? reservations[slug] ?? [];

                return (
                  <ReservationCard
                    key={`${name}-${idx}`}
                    name={name}
                    title={name}
                    size={reservationsForCard.length.toString()}
                    images={item.images}
                    maps={item.maps}
                    onClick={() => {
                      navigate({
                        to: `/${guild.vanityUrl ?? guild.id}/reservations/${slug}`,
                      });
                    }}
                  />
                );
              }),
            )
            .sort((a, b) => {
              const aLvl = reservationsCards[a.props.name]?.[0]?.lvl || 0;
              const bLvl = reservationsCards[b.props.name]?.[0]?.lvl || 0;
              return bLvl - aLvl;
            })}
        </div>
      </div>
    </div>
  );
};
