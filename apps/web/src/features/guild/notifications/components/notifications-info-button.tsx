import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationsInfoDialog } from "./notifications-info-dialog";

/** Opens the explanation of how notifications work. */
export const NotificationsInfoButton = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={t("settings.notifications.info.title")}
              onClick={() => setIsOpen(true)}
            >
              <Info className="size-4" aria-hidden="true" />
            </Button>
          }
        />
        <TooltipContent>
          {t("settings.notifications.info.title")}
        </TooltipContent>
      </Tooltip>
      <NotificationsInfoDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
