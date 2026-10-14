import {
  LIST_BAND_HEADING_CLASS,
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

/** How many fields each form section holds: rule, when, where and content. */
const SECTION_FIELDS = [2, 3, 1, 1];

/** Route-level stand-in for the rule form: banded sections of labelled fields. */
export const NotificationCreateSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    {SECTION_FIELDS.map((fields, sectionIndex) => (
      <div key={sectionIndex}>
        <div
          className={cn(
            LIST_GROUP_HEADING_CLASS,
            LIST_TILE_INSET_CLASS,
            LIST_BAND_HEADING_CLASS,
          )}
        >
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div
          className={cn(
            "flex max-w-3xl flex-col gap-5 py-5",
            LIST_TILE_INSET_CLASS,
          )}
        >
          {Array.from({ length: fields }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton
                className={cn(
                  "w-full rounded-lg",
                  sectionIndex === SECTION_FIELDS.length - 1 ? "h-40" : "h-9",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
