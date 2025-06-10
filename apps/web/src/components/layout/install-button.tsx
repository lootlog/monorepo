import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGlobalContext } from "@/hooks/use-global-context";
import { Button } from "@lootlog/ui/components/button";
import { DownloadIcon } from "lucide-react";
import { FC } from "react";

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
          <DownloadIcon color="#3E8667" className="!size-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Zainstaluj dodatek</TooltipContent>
    </Tooltip>
  );
};
