import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Download, FileCode2, Puzzle } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  ADDON_INSTALL_URL,
  ADDON_INSTALLATION_DOCS_URL,
  TAMPERMONKEY_URL,
} from "@/config/addon";
import { useGlobalContext } from "@/hooks/context/use-global-context";

const EXTENSION_TITLE_ID = "install-addon-extension-title";

const USERSCRIPT_TITLE_ID = "install-addon-userscript-title";

export const InstallAddonModal: FC = () => {
  const { installAddonModal } = useGlobalContext();
  const { t } = useTranslation();

  const handleModalClose = () => {
    installAddonModal.dispatch({ type: "CLOSE" });
  };

  const newTab = <span className="sr-only">{t("ui.externalLink.newTab")}</span>;

  return (
    <Dialog
      open={installAddonModal.state.isOpen}
      onOpenChange={handleModalClose}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("ui.modals.installAddon.title")}</DialogTitle>
          <DialogDescription>
            {t("ui.modals.installAddon.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
          <section
            aria-labelledby={EXTENSION_TITLE_ID}
            className="flex min-w-0 items-start gap-3 rounded-xl border border-border p-3 sm:p-4"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Puzzle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1">
                <h3
                  id={EXTENSION_TITLE_ID}
                  className="text-sm font-semibold text-foreground"
                >
                  {t("ui.modals.installAddon.extension.title")}
                </h3>
                <Badge variant="ready">
                  {t("ui.modals.installAddon.recommended")}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("ui.modals.installAddon.extension.description")}
              </p>
              <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t("ui.modals.installAddon.extension.unavailable")}
              </p>
            </div>
          </section>
          <section
            aria-labelledby={USERSCRIPT_TITLE_ID}
            className="flex min-w-0 items-start gap-3 rounded-xl border border-border p-3 sm:p-4"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <FileCode2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-h-8 items-center">
                <h3
                  id={USERSCRIPT_TITLE_ID}
                  className="text-sm font-semibold text-foreground"
                >
                  {t("ui.modals.installAddon.userscript.title")}
                </h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("ui.modals.installAddon.userscript.description")}
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground marker:text-muted-foreground">
                <li>
                  {t("ui.modals.installAddon.userscript.steps.tampermonkey")}{" "}
                  <TextLink
                    href={TAMPERMONKEY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline underline-offset-2"
                  >
                    {t("ui.modals.installAddon.userscript.getTampermonkey")}
                    {newTab}
                  </TextLink>
                </li>
                <li>{t("ui.modals.installAddon.userscript.steps.script")}</li>
                <li>{t("ui.modals.installAddon.userscript.steps.reload")}</li>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("ui.modals.installAddon.userscript.cookies")}
              </p>
              <Button
                className="mt-4"
                nativeButton={false}
                render={
                  <a
                    href={ADDON_INSTALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <Download aria-hidden="true" />
                {t("ui.modals.installAddon.userscript.install")}
                {newTab}
              </Button>
            </div>
          </section>
        </div>
        <div className="flex border-t border-border/70 px-4 py-2">
          <ChevronLink
            href={ADDON_INSTALLATION_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("ui.modals.installAddon.docs")}
            {newTab}
          </ChevronLink>
        </div>
      </DialogContent>
    </Dialog>
  );
};
