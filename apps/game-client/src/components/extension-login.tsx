import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { LOOTLOG_APP_URL } from "@/config/app";
import { DraggableWindow } from "@/components/draggable-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";

export function ExtensionLogin() {
  const { t } = useTranslation("common");
  const session = authClient.useSession();
  const open = useWindowsStore((state) => state["extension-login"].open);
  const size = useWindowsStore((state) => state["extension-login"].size);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const checking = session.isPending || session.isRefetching;

  if (session.data) return null;

  let message = t("auth.extensionDescription");
  if (session.error) message = t("auth.extensionError");
  if (checking) message = t("auth.extensionChecking");

  return (
    <DraggableWindow
      id="extension-login"
      isOpen={open}
      title={t("auth.extensionTitle")}
      resizable={false}
      minWidth={size.width}
      maxWidth={360}
      widthMode="fit-content"
      minHeight={size.height}
      contentClassName="ll:min-h-0"
      onClose={() => setOpen("extension-login", false)}
    >
      <section
        aria-label={t("auth.extensionTitle")}
        aria-busy={checking}
        className="ll:box-border ll:flex ll:h-full ll:min-h-0 ll:flex-col ll:justify-between ll:gap-3 ll:overflow-auto ll:p-3 ll:text-xs"
      >
        <p role="status" className="ll:m-0 ll:text-gray-200 ll:leading-relaxed">
          {message}
        </p>
        <div className="ll:flex ll:shrink-0 ll:flex-wrap ll:gap-2">
          <a
            className="ll:flex ll:h-7 ll:items-center ll:justify-center ll:rounded-sm ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:px-3 ll:text-white ll:hover:bg-gray-400/50 ll:focus-visible:outline-2"
            href={LOOTLOG_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("auth.signIn")}
          </a>
          <Button
            type="button"
            className="ll:h-7 ll:px-3 ll:focus-visible:outline-2"
            disabled={checking}
            onClick={() => void session.refetch()}
          >
            {checking ? t("auth.extensionChecking") : t("auth.extensionCheck")}
          </Button>
        </div>
      </section>
    </DraggableWindow>
  );
}
