import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { FC } from "react";
import { useGlobalContext } from "@/hooks/use-global-context";
import { ADDON_INSTALL_URL } from "@/config/addon";

export const InstallAddonModal: FC = () => {
  const { installAddonModal } = useGlobalContext();

  const handleModalClose = () => {
    installAddonModal.dispatch({ type: "CLOSE" });
  };

  return (
    <Dialog
      open={installAddonModal.state.isOpen}
      onOpenChange={handleModalClose}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instalacja dodatku</DialogTitle>
          <DialogDescription>
            Zainstaluj dodatek, aby korzystać z lootloga w grze.
          </DialogDescription>
        </DialogHeader>
        <a
          href={ADDON_INSTALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Instaluj dodatek
        </a>
        <DialogFooter>
          <Button variant="secondary" onClick={handleModalClose}>
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
