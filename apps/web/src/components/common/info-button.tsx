import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Info } from "lucide-react";

type InfoButtonProps = {
  /** Names the explanation the button opens; also shown as its tooltip. */
  label: string;
  onClick: () => void;
};

/** A quiet icon button beside a list's actions that opens how it works. */
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
