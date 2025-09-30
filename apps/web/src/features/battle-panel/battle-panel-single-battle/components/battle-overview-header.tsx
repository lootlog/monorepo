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
import { FC } from "react";

export type BattleOverviewHeaderProps = {
  isPublic: boolean;
  isPending: boolean;
  onShareClick: () => void;
  onCopyClick: () => void;
  onUnshareClick: () => void;
  onDeleteClick: () => void;
};

export const BattleOverviewHeader: FC<BattleOverviewHeaderProps> = ({
  isPublic,
  isPending,
  onShareClick,
  onCopyClick,
  onUnshareClick,
  onDeleteClick,
}) => {
  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4 py-2 h-14 min-h-14">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            Przegląd walki
          </div>
          <div className="flex flex-row gap-2">
            {isPublic ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCopyClick}
                  disabled={isPending}
                >
                  Skopiuj link <Copy />
                </Button>
                <Button
                  variant="outline"
                  onClick={onUnshareClick}
                  disabled={isPending}
                >
                  Ukryj <Lock />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={onShareClick}
                disabled={isPending}
              >
                Udostępnij <Share2 />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  Usuń
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Czy na pewno chcesz usunąć tę walkę?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta akcja jest nieodwracalna. Walka zostanie całkowicie
                    usunięta z systemu i nie będzie można jej przywrócić. Nie
                    będzie również brana podczas obliczania statystyk.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={onDeleteClick}>
                      Usuń walkę
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
