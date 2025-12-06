import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Grid2X2, List, Search } from "lucide-react";
import { ReservationCard } from "./reservation-card";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useReservations } from "@/hooks/api/reservations/use-reservations";
import { reservationSlug } from "./reservation-slug";
import {
  useReservationsCards,
  type ReservationCard as ReservationCardData,
} from "@/hooks/api/reservations/use-reservations-cards";
import { Input } from "@lootlog/ui/components/input";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useReservationsViewMode } from "@/hooks/use-reservations-view-mode";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";

export const Reservations: React.FC = () => {
  const { data: guild } = useGuild({});
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const { viewMode, setViewMode } = useReservationsViewMode();

  const { data: reservations } = useReservations();
  const { data: reservationsCards } = useReservationsCards();
  const { data: members } = useGuildMembers(true);

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

  const sortedCards = filteredCards
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

        return {
          name,
          idx,
          slug,
          item,
          reservationsForCard,
          lvl: item.lvl || 0,
        };
      }),
    )
    .sort((a, b) => b.lvl - a.lvl);

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="bg-background w-full flex items-center border-b h-14">
        <div className="flex-1 min-w-0 px-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Szukaj expowiska..."
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setViewMode("list")}
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Widok listy</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setViewMode("grid")}
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Widok siatki</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/20">
        <ScrollArea className="h-full">
          <div className="p-3">
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "flex flex-col gap-3"
              }
            >
              {sortedCards.map(
                ({ name, idx, slug, item, reservationsForCard }) => (
                  <ReservationCard
                    key={`${name}-${idx}`}
                    name={name}
                    title={name}
                    size={reservationsForCard.length.toString()}
                    images={item.images}
                    reservations={reservationsForCard}
                    members={members}
                    viewMode={viewMode}
                    onClick={() => {
                      navigate({
                        to: `/${guild.vanityUrl ?? guild.id}/reservations/${slug}`,
                      });
                    }}
                  />
                ),
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
