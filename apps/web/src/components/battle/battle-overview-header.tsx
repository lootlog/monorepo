import { Button } from "@lootlog/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lootlog/ui/components/alert-dialog";
import { Copy, Share2, Users, Lock } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleOverviewHeaderProps = {
  isPublic: boolean;
  isPending: boolean;
  onShareClick: () => void;
  onCopyClick: () => void;
  onUnshareClick: () => void;
  onDeleteClick: () => void;
  showActions?: boolean;
  labels?: {
    title: string;
    copyLink: string;
    hide: string;
    share: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    cancel: string;
    deleteBattle: string;
  };
};

export const BattleOverviewHeader: FC<BattleOverviewHeaderProps> = ({
  isPublic,
  isPending,
  onShareClick,
  onCopyClick,
  onUnshareClick,
  onDeleteClick,
  showActions = true,
  labels,
}) => {
  const { t } = useTranslation();
  const resolvedLabels = labels ?? {
    title: t("battleUi.overviewHeader.title"),
    copyLink: t("battleUi.overviewHeader.copyLink"),
    hide: t("battleUi.overviewHeader.hide"),
    share: t("battleUi.overviewHeader.share"),
    delete: t("battleUi.overviewHeader.delete"),
    deleteConfirmTitle: t("battleUi.overviewHeader.deleteConfirmTitle"),
    deleteConfirmDescription: t(
      "battleUi.overviewHeader.deleteConfirmDescription",
    ),
    cancel: t("battleUi.overviewHeader.cancel"),
    deleteBattle: t("battleUi.overviewHeader.deleteBattle"),
  };
  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4 py-2 h-14 min-h-14">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            {resolvedLabels.title}
          </div>
          {showActions && (
            <div className="flex flex-row gap-2">
              {isPublic ? (
                <>
                  <Button
                    variant="outline"
                    onClick={onCopyClick}
                    disabled={isPending}
                  >
                    {resolvedLabels.copyLink} <Copy />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onUnshareClick}
                    disabled={isPending}
                  >
                    {resolvedLabels.hide} <Lock />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={onShareClick}
                  disabled={isPending}
                >
                  {resolvedLabels.share} <Share2 />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isPending}>
                    {resolvedLabels.delete}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {resolvedLabels.deleteConfirmTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {resolvedLabels.deleteConfirmDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {resolvedLabels.cancel}
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={onDeleteClick}>
                        {resolvedLabels.deleteBattle}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
