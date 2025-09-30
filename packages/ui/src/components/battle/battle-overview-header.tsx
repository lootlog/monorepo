import { Button } from "../button.js";
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
} from "../alert-dialog.js";
import { Copy, Share2, Users, Lock } from "lucide-react";
import { FC } from "react";

export type BattleOverviewHeaderProps = {
  isPublic: boolean;
  isPending: boolean;
  onShareClick: () => void;
  onCopyClick: () => void;
  onUnshareClick: () => void;
  onDeleteClick: () => void;
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
  labels = {
    title: "Battle Overview",
    copyLink: "Copy link",
    hide: "Hide",
    share: "Share",
    delete: "Delete",
    deleteConfirmTitle: "Are you sure you want to delete this battle?",
    deleteConfirmDescription: "This action is irreversible. The battle will be completely removed from the system and cannot be restored. It will also not be counted in statistics calculations.",
    cancel: "Cancel",
    deleteBattle: "Delete battle",
  }
}) => {
  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4 py-2 h-14 min-h-14">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            {labels.title}
          </div>
          <div className="flex flex-row gap-2">
            {isPublic ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCopyClick}
                  disabled={isPending}
                >
                  {labels.copyLink} <Copy />
                </Button>
                <Button
                  variant="outline"
                  onClick={onUnshareClick}
                  disabled={isPending}
                >
                  {labels.hide} <Lock />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={onShareClick}
                disabled={isPending}
              >
                {labels.share} <Share2 />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  {labels.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {labels.deleteConfirmTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {labels.deleteConfirmDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={onDeleteClick}>
                      {labels.deleteBattle}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
};