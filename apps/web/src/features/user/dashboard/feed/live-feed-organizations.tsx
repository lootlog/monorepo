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

type Props = {
  organizations: UserFeedResponseDtoOutput["items"][number]["guild"][];
};

export const LiveFeedOrganizations = ({ organizations }: Props) => {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds({
    query: { enabled: false },
  });
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {organizations.map((organization) => (
          <Tooltip key={organization.id}>
            <TooltipTrigger
              render={
                <Link
                  to="/$guildId"
                  params={{
                    guildId: organization.vanityUrl ?? organization.id,
                  }}
                  aria-label={organization.name}
                  className="size-8 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              }
            >
              <Avatar className="size-8" aria-hidden>
                <AvatarImage
                  src={
                    guilds?.find((guild) => guild.id === organization.id)
                      ?.icon ?? undefined
                  }
                  alt=""
                />
                <AvatarFallback className="text-xs font-medium">
                  {organization.name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{organization.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
