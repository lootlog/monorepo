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
      <div className="flex items-center justify-end -space-x-1.5">
        {organizations.map((organization) => (
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
      </div>
    </TooltipProvider>
  );
};
