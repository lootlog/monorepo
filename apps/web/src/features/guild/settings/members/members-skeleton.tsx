import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { SettingsListSkeleton } from "../components/settings-list-skeleton";
import type { MemberStatusFilter } from "./member-list-item.utils";

/** Each status pill's loaded width, with a three-digit count. */
const PILL_WIDTHS: Record<MemberStatusFilter, string> = {
  all: "w-25.5",
  active: "w-24.5",
  inactive: "w-29",
  online: "w-18",
  problems: "w-24.5",
};

export const MembersSettingsSkeleton = () => (
  <SettingsListSkeleton
    toolbar={
      <>
        <div className="max-sm:order-last max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] max-sm:overflow-hidden max-sm:px-3">
          <div className="flex flex-wrap gap-1.5 max-sm:w-max max-sm:flex-nowrap">
            {Object.entries(PILL_WIDTHS).map(([filter, width]) => (
              <Skeleton
                key={filter}
                className={cn("h-8 shrink-0 rounded-lg", width)}
              />
            ))}
          </div>
        </div>
        {/* Phones show the refresh button as an icon. */}
        <Skeleton className="h-8 w-45.5 rounded-lg max-sm:w-8" />
      </>
    }
    tile={{
      actions: 1,
      trailing: <Skeleton className="h-6 w-24 shrink-0 rounded-full" />,
    }}
    tiles={12}
  />
);
