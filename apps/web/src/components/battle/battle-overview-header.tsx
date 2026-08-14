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
};

export const BattleOverviewHeader: FC<BattleOverviewHeaderProps> = ({
  isPublic,
  isPending,
  onShareClick,
  onCopyClick,
  onUnshareClick,
  onDeleteClick,
  showActions = true,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4 py-2 h-14 min-h-14">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            {t("battleUi.overviewHeader.title")}
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
                    {t("battleUi.overviewHeader.copyLink")} <Copy />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onUnshareClick}
                    disabled={isPending}
                  >
                    {t("battleUi.overviewHeader.hide")} <Lock />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={onShareClick}
                  disabled={isPending}
                >
                  {t("battleUi.overviewHeader.share")} <Share2 />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" disabled={isPending}>
                      {t("battleUi.overviewHeader.delete")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("battleUi.overviewHeader.deleteConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("battleUi.overviewHeader.deleteConfirmDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("battleUi.overviewHeader.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      render={
                        <Button variant="destructive" onClick={onDeleteClick}>
                          {t("battleUi.overviewHeader.deleteBattle")}
                        </Button>
                      }
                    />
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
