import {
  useUsersControllerGetCurrentUserGuilds,
  type UserFeedResponseDtoOutput,
} from "@lootlog/client/main";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";

/** Avatars past this many collapse into `+N`, so a widely shared event keeps one row. */
const VISIBLE_ORGANIZATIONS = 3;

type Props = {
  organizations: UserFeedResponseDtoOutput["items"][number]["guild"][];
};

export const LiveFeedOrganizations = ({ organizations }: Props) => {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds({
    query: { enabled: false },
  });

  const hidden = organizations.slice(VISIBLE_ORGANIZATIONS);

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end -space-x-1.5">
        {organizations.slice(0, VISIBLE_ORGANIZATIONS).map((organization) => (
          <Tooltip key={organization.id}>
            <TooltipTrigger
              render=<Link
                to="/$guildId"
                params={{
                  guildId: organization.vanityUrl ?? organization.id,
                }}
                aria-label={organization.name}
                className="size-6 shrink-0 rounded-md outline-none ring-2 ring-background focus-visible:ring-ring"
              />
            >
              <Avatar className="size-6 rounded-md" aria-hidden>
                <AvatarImage
                  src={
                    guilds?.find((guild) => guild.id === organization.id)
                      ?.icon ?? undefined
                  }
                  alt=""
                />
                <AvatarFallback className="rounded-none text-[0.625rem] font-medium">
                  {organization.name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{organization.name}</TooltipContent>
          </Tooltip>
        ))}
        {hidden.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render=<button
                type="button"
                aria-label={hidden.map(({ name }) => name).join(", ")}
                className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-muted px-1 text-[0.625rem] font-semibold tabular-nums text-muted-foreground outline-none ring-2 ring-background focus-visible:ring-ring"
              />
            >
              +{hidden.length}
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {hidden.map(({ name }) => name).join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
