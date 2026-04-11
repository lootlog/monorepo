import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import type { FC } from "react";
import { ADDON_INSTALL_URL } from "@/config/addon";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import { useTranslation } from "react-i18next";

export const InstallAddonModal: FC = () => {
  const { installAddonModal } = useGlobalContext();
  const { t } = useTranslation();

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
          <DialogTitle>{t("ui.modals.installAddon.title")}</DialogTitle>
          <DialogDescription>
            {t("ui.modals.installAddon.description")}
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
            {t("ui.actions.installAddon")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
