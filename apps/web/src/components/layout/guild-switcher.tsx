import * as React from "react";
import { CaretSortIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover";
import { Button } from "@lootlog/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lootlog/ui/components/command";
import { cn } from "utils/cn";
import { useGuilds } from "hooks/api/use-guilds";
import { useGuild } from "hooks/api/use-guild";
import { useGuildId } from "hooks/use-guild-id";
import { useNavigate } from "react-router-dom";
import { CreateGuildModal } from "components/common/create-guild-modal/create-guild-modal";
import { useGlobalContext } from "hooks/use-global-context";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface Props extends PopoverTriggerProps {
  className?: string;
}

export const GuildSwitcher: React.FC<Props> = ({ className }) => {
  const guildId = useGuildId();
  const [open, setOpen] = React.useState(false);
  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();
  const navigate = useNavigate();

  const { data: guild } = useGuild({});
  const { data: guilds } = useGuilds();

  const handleSelect = (guildId: string) => {
    setOpen(false);
    navigate(`/${guildId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a team"
          className={cn("w-full justify-between px-2 h-12 text-md", className)}
        >
          <Avatar className="mr-4 h-8 w-8">
            <AvatarImage src={guild?.icon as string} className="grayscale" />
            <AvatarFallback>{guild?.name[0]}</AvatarFallback>
          </Avatar>
          {guild?.name}
          <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Szukaj..." />
            <CommandEmpty>Nie znaleziono.</CommandEmpty>
            <CommandGroup className="py-4" heading="Lista lootlogów">
              {guilds?.map((guild) => {
                const isActive =
                  guild.id === guildId || guild.vanityUrl === guildId;
                return (
                  <CommandItem
                    key={guild.id}
                    className={cn("text-sm my-1 font-semibold", {
                      "bg-violet-900": isActive,
                      "aria-selected:bg-violet-700": isActive,
                    })}
                    onSelect={() => handleSelect(guild.vanityUrl ?? guild.id)}
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage
                        src={guild.icon as string}
                        alt={guild.name}
                        className="grayscale"
                      />
                      <AvatarFallback>{guild.name[0]}</AvatarFallback>
                    </Avatar>
                    {guild.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup className="py-2">
              <CreateGuildModal />
              <CommandItem
                onSelect={() => {
                  dispatch({ type: "OPEN" });
                }}
              >
                <PlusCircledIcon className="mr-2 h-5 w-5" />
                Stwórz lootloga
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
