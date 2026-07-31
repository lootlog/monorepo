import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Grid2X2, List, SearchX } from "lucide-react";
import { ReservationCard } from "./reservation-card";
import { reservationSlug } from "./reservation-slug";
import {
  reservationsCardsQueryOptions,
  reservationsQueryOptions,
} from "./reservations-api";
import {
  useReservationsControllerGetReservations,
  useReservationsControllerGetReservationsCards,
} from "@lootlog/api-client/react-query/main/reservations";
import type { ReservationsCardsResponseDtoOutputItem } from "@lootlog/api-client/models/main/reservations-cards-response-dto-output-item";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useViewMode } from "@/hooks/use-view-mode";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  useGuildsControllerGetGuildById,
} from "@lootlog/api-client/react-query/main/guilds";
import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/api-client/react-query/main/members";
import { SearchInput } from "@/components/ui/search-input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";

type ReservationCardEntries = Array<
  [string, ReservationsCardsResponseDtoOutputItem[]]
>;

const getReservationLookupKey = (
  name: string,
  slug: string,
  reservations: Record<string, unknown>,
) => {
  if (slug in reservations) {
    return slug;
  }

  if (name in reservations) {
    return name;
  }

  return name.toLowerCase();
};

export const Reservations: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const guildId = useGuildId();
  const hasGuildId = Boolean(guildId);
  const { data: guild } = useGuildsControllerGetGuildById(
    {
      guildId: guildId ?? "",
    },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getGuildsControllerGetGuildByIdQueryKey({
          guildId: guildId ?? "",
        }),
      },
    },
  );

  const [searchValue, setSearchValue] = useState("");
  const { viewMode, setViewMode } = useViewMode("reservations-view-mode");

  const { data: reservations } = useReservationsControllerGetReservations(
    { guildId: guildId ?? "" },
    {
      query: {
        ...reservationsQueryOptions(guildId ?? ""),
      },
    },
  );
  const { data: reservationsCards } =
    useReservationsControllerGetReservationsCards(
      { guildId: guildId ?? "" },
      {
        query: {
          ...reservationsCardsQueryOptions(guildId ?? ""),
        },
      },
    );
  const { data: members } = useMembersControllerGetGuildMemberReferences(
    { guildId: guildId ?? "" },
    {
      includeInactive: true,
    },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getMembersControllerGetGuildMemberReferencesQueryKey(
          { guildId: guildId ?? "" },
          { includeInactive: true },
        ),
      },
    },
  );

  const normalizedSearch = searchValue.trim().toLowerCase();
  const reservationCardEntries = Object.entries(
    reservationsCards ?? {},
  ) as ReservationCardEntries;
  const filteredCards = normalizedSearch
    ? reservationCardEntries.filter(([name]) =>
        name.toLowerCase().includes(normalizedSearch),
      )
    : reservationCardEntries;

  const isLoading = !guild || !reservations || !reservationsCards;
  const guildPath = guild?.vanityUrl ?? guild?.id;

  const handleReservationClick = (slug: string) => {
    if (!guildPath) {
      return;
    }

    navigate({
      to: `/${guildPath}/reservations/${slug}`,
    });
  };

  const sortedCards = isLoading
    ? []
    : filteredCards
        .flatMap(([name, items]) =>
          items.map((item, idx) => {
            const slug = reservationSlug(name);
            const normalizedKey = getReservationLookupKey(
              name,
              slug,
              reservations,
            );
            const reservationsForCard =
              reservations[normalizedKey] ?? reservations[slug] ?? [];

            return {
              name,
              idx,
              slug,
              item,
              reservationsForCard,
              lvl: item.lvl ?? 0,
            };
          }),
        )
        .sort((a, b) => b.lvl - a.lvl);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="px-3 pt-3">
        <Card className="gap-2 border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("reservations.searchPlaceholder")}
              className="h-9"
              wrapperClassName="min-w-0 flex-1"
              disabled={isLoading}
            />

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setViewMode("list")}
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    aria-label={t("reservations.view.list")}
                    aria-pressed={viewMode === "list"}
                    className="h-8 w-8"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t("reservations.view.list")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setViewMode("grid")}
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    aria-label={t("reservations.view.grid")}
                    aria-pressed={viewMode === "grid"}
                    className="h-8 w-8"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t("reservations.view.grid")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {isLoading ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-3 pb-3">
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    : "flex flex-col gap-3"
                }
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <ReservationCardSkeleton key={i} viewMode={viewMode} />
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : sortedCards.length === 0 ? (
          <div className="flex flex-1 items-start justify-center px-3 pb-3 md:items-center">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("reservations.empty.title")}</EmptyTitle>
                <EmptyDescription>
                  {normalizedSearch
                    ? t("reservations.empty.searchDescription")
                    : t("reservations.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
              {normalizedSearch && (
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchValue("")}
                  >
                    {t("reservations.empty.clearSearch")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-3 pb-3">
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
                      images={item.images}
                      reservations={reservationsForCard}
                      members={members}
                      viewMode={viewMode}
                      onClick={() => handleReservationClick(slug)}
                    />
                  ),
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
