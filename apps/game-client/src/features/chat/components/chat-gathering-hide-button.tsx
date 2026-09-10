import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

export function ChatGatheringHideButton({
  pending,
  onHide,
}: {
  pending: boolean;
  onHide: () => void;
}) {
  const { t } = useTranslation("chat");
  const label = t("gatherings.hide");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6`}
          aria-label={label}
          disabled={pending}
          onClick={onHide}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
