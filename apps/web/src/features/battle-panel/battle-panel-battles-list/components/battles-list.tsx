import type {
  GetBattlesResponse,
  UseBattlesParams,
} from "@/hooks/api/battle-log/use-battles";
import type { BattleCharacter } from "@/hooks/api/battle-log/use-battle-characters";
import { BattlesListEntry } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list-entry";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@lootlog/ui/components/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { BattlesListFilters, type BattleFilters } from "./battles-list-filters";
import { Swords } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { Spinner } from "@lootlog/ui/components/spinner";

type BattlesListProps = {
  battlesResponse?: GetBattlesResponse;
  characters?: BattleCharacter[];
  params?: UseBattlesParams;
  onPageChange?: (page: number) => void;
  onFiltersChange?: (filters: BattleFilters) => void;
  showPagination?: boolean;
  showFilters?: boolean;
  isLoading?: boolean;
};

export const BattlesList = ({
  battlesResponse,
  characters,
  params,
  onPageChange,
  onFiltersChange,
  showPagination = false,
  showFilters = false,
  isLoading = false,
}: BattlesListProps) => {

  const currentFilters: BattleFilters = {
    world: params?.world,
    type: params?.type,
    search: params?.search,
    result: params?.result,
    ph: params?.ph,
    characterId: params?.characterId,
  };

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const handleResultClick = (result: "won" | "lost" | "flee") => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        result: [result],
      });
    }
  };

  const handleWorldClick = (world: string) => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        world,
      });
    }
  };

  const handlePhClick = () => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        ph: true,
      });
    }
  };

  const renderPaginationItems = () => {
    if (!battlesResponse?.pagination) return null;

    const { page, totalPages } = battlesResponse.pagination;
    const items = [];

    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          onClick={() => handlePageClick(1)}
          isActive={page === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (page > 3) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageClick(i)}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (page < totalPages - 2) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageClick(totalPages)}
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="flex flex-col h-full">
      {showFilters && onFiltersChange && (
        <BattlesListFilters
          filters={currentFilters}
          onFiltersChange={onFiltersChange}
          characters={characters}
        />
      )}

      <div
        className={cn("flex-1", {
          "flex items-center justify-center min-h-[70vh]":
            isLoading || battlesResponse?.battles.length === 0,
        })}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Ładowanie walk...</p>
          </div>
        ) : battlesResponse?.battles.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Swords />
              </EmptyMedia>
              <EmptyTitle>Brak walk</EmptyTitle>
              <EmptyDescription>
                Nie znaleziono żadnych walk spełniających kryteria wyszukiwania
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          battlesResponse?.battles.map((battle) => (
            <BattlesListEntry
              key={battle.id}
              battle={battle}
              onResultClick={handleResultClick}
              onWorldClick={handleWorldClick}
              onPhClick={handlePhClick}
            />
          ))
        )}
      </div>

      {showPagination &&
        battlesResponse?.pagination &&
        battlesResponse.pagination.totalPages > 1 && (
          <div className="sticky bottom-0 mt-auto bg-background border-t h-16 flex items-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      battlesResponse.pagination.hasPrev &&
                      handlePageClick(battlesResponse.pagination.page - 1)
                    }
                    className={
                      !battlesResponse.pagination.hasPrev
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      battlesResponse.pagination.hasNext &&
                      handlePageClick(battlesResponse.pagination.page + 1)
                    }
                    className={
                      !battlesResponse.pagination.hasNext
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
    </div>
  );
};
