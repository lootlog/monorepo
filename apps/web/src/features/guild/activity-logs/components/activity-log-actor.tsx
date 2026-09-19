import { PlayerTile } from "@/components/tiles/player-tile";
import { MARGONEM_GUILD_URL } from "@/constants/margonem";
import type { PaginatedActivitiesResponseDtoDataItem } from "@lootlog/client/activity";
import { TextLink } from "@lootlog/ui/components/text-link";

type ActivityLogActorProps = {
  activity: PaginatedActivitiesResponseDtoDataItem;
};

export const ActivityLogActor = ({ activity }: ActivityLogActorProps) => {
  const actor = activity.actorSnapshot;

  if (!actor) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const level = `${actor.lvl}${actor.prof?.[0]?.toLowerCase() ?? ""}`;

  return (
    <span className="flex min-w-0 items-center gap-3">
      {actor.icon && (
        <span className="relative h-9 w-6 shrink-0">
          <PlayerTile
            player={{
              id: actor.id,
              name: actor.name,
              lvl: actor.lvl,
              prof: actor.prof,
              icon: actor.icon,
            }}
            className="absolute left-0 top-0 origin-top-left scale-75"
            accountId={actor.accountId}
            characterId={actor.characterId}
            world={activity.world ?? undefined}
          />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium leading-tight">
          {actor.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {level}
          {actor.clanName && " · "}
          {actor.clanName && actor.clanId && activity.world ? (
            <TextLink
              href={`${MARGONEM_GUILD_URL},${activity.world},${actor.clanId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {actor.clanName}
            </TextLink>
          ) : (
            actor.clanName
          )}
        </span>
      </span>
    </span>
  );
};
