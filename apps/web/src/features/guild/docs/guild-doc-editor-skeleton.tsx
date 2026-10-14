import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { canWriteGuildDocs } from "./docs-permissions";
import { GUILD_DOC_COLUMN_CLASS } from "./guild-doc-column";

/** Formatting controls per toolbar group, as the editor toolbar lays them out. */
const TOOLBAR_GROUPS = [2, 4, 5, 6, 3];

const TEXT_LINE_WIDTHS = ["w-1/3", "w-11/12", "w-4/5", "w-full", "w-2/3"];

export const GuildDocEditorSkeleton = () => {
  const { data: accessPolicy, isLoading } = useGuildPermissions();
  const canWrite = isLoading || canWriteGuildDocs(accessPolicy);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        {canWrite && (
          <div
            data-list-tile
            className={cn(
              "flex min-h-12 items-center gap-1 overflow-hidden",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <div className="-ml-3 flex min-w-0 flex-1 items-center gap-1 px-1 py-2">
              {TOOLBAR_GROUPS.map((count, group) => (
                <div key={group} className="flex shrink-0 items-center gap-1">
                  {group > 0 && <span className="mx-1 h-5 w-px bg-border" />}
                  {Array.from({ length: count }, (_, index) => (
                    <span
                      key={index}
                      className="flex size-8 items-center justify-center"
                    >
                      <Skeleton className="size-4 rounded" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <span className="mx-1 h-5 w-px shrink-0 bg-border" />
            <span className="mr-2 hidden text-xs leading-tight xl:block">
              <SkeletonLine className="h-3 w-50" />
            </span>
            {Array.from({ length: 2 }, (_, index) => (
              <span
                key={index}
                className="flex size-8 shrink-0 items-center justify-center"
              >
                <Skeleton className="size-4 rounded" />
              </span>
            ))}
          </div>
        )}
        {!canWrite && (
          <div
            data-list-tile
            className={cn(
              "flex min-h-12 items-center gap-x-4 py-2",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <span className="flex h-8 items-center gap-2 text-sm">
              <Skeleton className="size-4 shrink-0 rounded" />
              <SkeletonLine className="h-3.5 w-20 max-sm:hidden" />
            </span>
            <span className="ml-auto text-xs leading-tight">
              <SkeletonLine className="h-3 w-66 max-sm:w-56" />
            </span>
          </div>
        )}
        <div
          className={cn(
            "flex flex-col pt-6 text-sm leading-5",
            GUILD_DOC_COLUMN_CLASS,
          )}
        >
          {TEXT_LINE_WIDTHS.map((width) => (
            <SkeletonLine key={width} className={cn("h-3.5", width)} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
