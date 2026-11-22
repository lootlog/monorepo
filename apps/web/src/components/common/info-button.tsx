import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Info } from "lucide-react";

type InfoButtonProps = {
  label: string;
  onClick: () => void;
};

export const InfoButton = ({ label, onClick }: InfoButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground"
          aria-label={label}
          onClick={onClick}
        >
          <Info className="size-4" aria-hidden="true" />
        </Button>
      }
    />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
