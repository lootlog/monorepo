import { FC } from "react";
import { Loot } from "@/hooks/api/use-loots";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lootlog/ui/components/sheet";
import { LootNpcs } from "@/screens/guild/components/loots-list/loot-npcs";
import { LootComments } from "@/screens/guild/components/loots-list/loot-comments";
import { LootDetails } from "@/screens/guild/components/loots-list/loot-details";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@lootlog/ui/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerTile } from "@/screens/guild/components/loots-list/player-tile";
import { LootDetailsActions } from "@/screens/guild/components/loots-list/loot-details-actions";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/use-guild-permissions";
import { useIsOwner } from "@/hooks/use-is-owner";

export type LootDetailsSheetProps = {
  loot: Loot;
  ownerMap: Record<string, string | undefined>;
  playerColorMap: Record<string, { color: string; idx: number }>;
};

const MANAGE_LOOTS_PERMISIONS = [Permission.LOOTLOG_MANAGE, Permission.ADMIN];

export const LootDetailsSheetContent: FC<LootDetailsSheetProps> = ({
  loot,
  ownerMap,
  playerColorMap,
}) => {
  const date = timestampToDate(loot.createdAt);
  const { data: permissions } = useGuildPermissions();
  const isOwner = useIsOwner();
  const isMobile = useIsMobile();
  const canManageLoots =
    permissions?.some((p) => MANAGE_LOOTS_PERMISIONS.includes(p)) || isOwner;

  return (
    <SheetContent
      className={cn("flex flex-col gap-0 lg:w-[25rem] lg:!max-w-[25rem]", {
        "w-full": isMobile,
      })}
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <SheetHeader className="border-b">
        <SheetTitle className="pb-4 flex flex-col items-start">
          <LootNpcs
            npcs={loot.npcs}
            className="p-4 pb-0 mb-2 text-left pr-12"
          />
          <span className="text-xs font-normal text-muted-foreground px-4">
            {loot.location}
          </span>
          <span className="text-xs font-normal text-muted-foreground px-4">
            Zdobyto {date}
          </span>
        </SheetTitle>
      </SheetHeader>
      {canManageLoots && (
        <div className="border-b p-4">
          <LootDetailsActions loot={loot} />
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-row gap-1 flex-wrap p-4 border-b">
          {loot.players.map((player, idx) => {
            const color = playerColorMap[player.id];
            return (
              <PlayerTile
                key={player.id}
                player={player}
                idx={idx}
                color={color?.color}
                className="scale-90"
              />
            );
          })}
        </div>
        <LootDetails loot={loot} ownerMap={ownerMap} />
        <LootComments lootId={loot.id} />
      </ScrollArea>
    </SheetContent>
  );
};
