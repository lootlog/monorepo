import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type FC, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { NativeScrollArea } from "@/components/ui/native-scroll-area";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@/lib/api/generated/main/users/users";

type GuildMultiSelectorProps = {
  disabled?: boolean;
  className?: string;
  onChange: (guildIds: string[]) => void;
  value: string[];
};

export const GuildMultiSelector: FC<GuildMultiSelectorProps> = ({
  disabled = false,
  className = "",
  onChange,
  value,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleToggle = (guildId: string) => {
    if (disabled) return;

    const isSelected = value.includes(guildId);
    if (isSelected) {
      onChange(value.filter((id) => id !== guildId));
    } else {
      onChange([...value, guildId]);
    }
  };

  const getGuildInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <TooltipProvider>
      <NativeScrollArea
        className={cn("ll:w-full", className)}
        orientation="horizontal"
        ref={scrollContainerRef}
      >
        <div className="ll:flex ll:gap-1 ll:mt-1">
          {guilds?.map((guild) => {
            const isSelected = value.includes(guild.id);

            return (
              <Tooltip key={guild.id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => handleToggle(guild.id)}
                    disabled={disabled}
                    className={cn(
                      "ll:flex ll:items-center ll:justify-center ll:transition-all ll:border-2 ll:rounded-sm ll:relative",
                      "hover:ll:scale-105",
                      "disabled:ll:opacity-50 disabled:ll:cursor-not-allowed",
                      "ll:size-7 ll:p-0 ll:shrink-0",
                      "ll:border-gray-600 ll:bg-gray-800/50 hover:ll:border-muted/20",
                      !disabled && "ll-custom-cursor-pointer",
                      {
                        "ll:border-primary ll:bg-blue-600/20 ll:shadow-primary/50":
                          isSelected,
                      },
                    )}
                  >
                    <Avatar className="ll:size-full ll:flex ll:items-center ll:justify-center">
                      <AvatarImage
                        src={guild.icon ?? undefined}
                        alt={guild.name}
                        className="ll:object-cover ll:size-full ll:rounded-sm"
                      />
                      <AvatarFallback className="ll:text-xs ll:font-semibold">
                        {getGuildInitial(guild.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="ll:z-500">
                  <p className="ll:text-xs ll:font-semibold">{guild.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </NativeScrollArea>
    </TooltipProvider>
  );
};
