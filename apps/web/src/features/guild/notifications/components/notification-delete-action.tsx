import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";

type NotificationDeleteActionProps = {
  description: string;
  disabled: boolean;
  onConfirm: () => void | Promise<void>;
  title: string;
};

export const NotificationDeleteAction = ({
  description,
  disabled,
  onConfirm,
  title,
}: NotificationDeleteActionProps) => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex">
            <ConfirmDeleteDialog
              disabled={disabled}
              onConfirm={onConfirm}
              title={title}
              description={description}
              confirmButtonLabel={t("settings.notifications.actions.delete")}
              cancelButtonLabel={t("settings.notifications.actions.cancel")}
              trigger={
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  aria-label={t("settings.notifications.actions.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </span>
        }
      />
      <TooltipContent>
        {t("settings.notifications.actions.delete")}
      </TooltipContent>
    </Tooltip>
  );
};
