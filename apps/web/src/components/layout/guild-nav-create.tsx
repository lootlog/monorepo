import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { PlusCircleIcon } from "lucide-react";
import type { FC } from "react";
import { useGlobalContext } from "@/hooks/context/use-global-context";

export const GuildNavCreate: FC = () => {
  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="size-10 0"
          variant="secondary"
          onClick={() => dispatch({ type: "OPEN" })}
        >
          <PlusCircleIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Stwórz nowy lootlog</TooltipContent>
    </Tooltip>
  );
};
