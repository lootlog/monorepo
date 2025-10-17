import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { FC } from "react";
import { ADDON_INSTALL_URL } from "@/config/addon";
import { useGlobalContext } from "@/hooks/context/use-global-context";

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
        <div className="p-4">
          <a
            href={ADDON_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
            onClick={handleModalClose}
          >
            Instaluj dodatek
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
