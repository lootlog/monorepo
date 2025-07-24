import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorlds } from "@/hooks/api/use-worlds";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { FC, useEffect } from "react";

export type WorldSelectorProps = {
  disabled?: boolean;
  className?: string;
};

export const WorldSelector: FC<WorldSelectorProps> = ({
  disabled = false,
  className = "",
}) => {
  const { world: defaultWorld, characterId } = useGlobalStore(
    (state) => state.gameState
  );
  const { guildIdByCharId, world, setWorld } = useSettingsStore();
  const guildId = guildIdByCharId[characterId!];
  const { data: worlds, isFetched } = useWorlds({ guildId });

  useEffect(() => {
    if (!isFetched || !guildId || !worlds) return;
    if (!world) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(worlds[0]);
      }
      return;
    }

    if (!worlds.includes(world)) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(worlds[0]);
      }
    }
  }, [guildId, isFetched, worlds, world, defaultWorld, setWorld]);

  return (
    <Select value={world} onValueChange={setWorld} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "ll-text-white ll-text-xs ll-border-gray-400 ll-rounded-xs ll-h-4 ll-mb-1 ll-custom-cursor-pointer",
          className
        )}
      >
        <SelectValue
          placeholder="Wybierz świat..."
          className="ll-h-4 ll-text-sm ll-text-white"
        />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="ll-font-sans ll-z-[500] ll-w-[120px] ll-py-1 ll-justify-center ll-items-center"
      >
        {worlds?.map((world) => {
          return (
            <SelectItem
              key={world}
              value={world}
              className="ll-text-xs ll-font-semibold ll-w-full ll-h-5"
            >
              {world.charAt(0).toUpperCase() + world.slice(1)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
