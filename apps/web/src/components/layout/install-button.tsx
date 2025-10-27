import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { Blocks } from "lucide-react";
import type { FC } from "react";
import { useGlobalContext } from "@/hooks/context/use-global-context";

export const InstallButton: FC = () => {
  const {
    installAddonModal: { dispatch },
  } = useGlobalContext();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          className="size-10"
          onClick={() => dispatch({ type: "OPEN" })}
        >
          <Blocks color="#3E8667" className="!size-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Zainstaluj dodatek</TooltipContent>
    </Tooltip>
  );
};
