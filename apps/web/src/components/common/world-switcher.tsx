import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorlds } from "@/hooks/api/use-worlds";
import { useGuildContext } from "@/hooks/use-guild-context";

export const WorldSwitcher: React.FC = () => {
  const { data: worlds } = useWorlds();
  const { setWorld, world } = useGuildContext();

  const handleSelect = (world: string) => {
    setWorld(world);
  };

  // useEffect(() => {
  //   if (worlds && !worlds.includes(world) && !isPending) {
  //     setWorld("");
  //   }
  // }, [worlds, setWorld, world, isPending]);

  return (
    <Select onValueChange={handleSelect} value={world ?? ""}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Wybierz świat" />
      </SelectTrigger>
      <SelectContent>
        {worlds?.map((world) => {
          return (
            <SelectItem key={world} value={world}>
              {world.charAt(0).toUpperCase() + world.slice(1)}
            </SelectItem>
          );
        })}
        {worlds?.length === 0 && (
          <div className="h-12 flex items-center justify-center">
            Brak światów
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
