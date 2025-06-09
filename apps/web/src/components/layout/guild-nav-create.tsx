import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGlobalContext } from "@/hooks/use-global-context";
import { Button } from "@lootlog/ui/components/button";
import { PlusCircleIcon } from "lucide-react";
import { FC } from "react";

export const GuildNavCreate: FC = () => {
  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();

  return (
    <Tooltip>
      <TooltipTrigger>
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
