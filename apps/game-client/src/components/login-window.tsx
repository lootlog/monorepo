import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LOOTLOG_APP_URL } from "@/config/app";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { WindowLauncher } from "@/components/window-launcher";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { detectCookieBrowser } from "@/hooks/auth/detect-cookie-browser";
import {
  markLoginWebsiteOpened,
  useLoginState,
} from "@/hooks/auth/use-login-state";
import { authClient } from "@/lib/auth-client";
import { isExtensionClient } from "@/lib/game-client-platform";
import { useWindowsStore } from "@/store/windows.store";

/**
 * The single sign-in surface of both installations: the player signs in on
 * the website and comes back. The extension reads that first-party session
 * through its background worker; the userscript needs the browser to send
 * Lootlog's cookie to the Margonem page, so a round trip that still ends
 * signed out points at blocked third-party cookies.
 */
export function LoginWindow() {
  const { t } = useTranslation("common");
  const { state, session } = useLoginState();
  const extension = isExtensionClient();
  const open = useWindowsStore((windows) => windows["extension-login"].open);
  const size = useWindowsStore((windows) => windows["extension-login"].size);
  const setOpen = useWindowsStore((windows) => windows.setOpen);
  const openAndFocus = useWindowsStore((windows) => windows.openAndFocus);
  const signedIn = state === "signedIn";
  const busy = state === "checking";

  // Coming back from the website tab focuses this window without changing its
  // visibility, which is all Better Auth listens to.
  useEffect(() => {
    if (signedIn) return;

    const recheck = () => authClient.$store.notify("$sessionSignal");

    window.addEventListener("focus", recheck);

    return () => window.removeEventListener("focus", recheck);
  }, [signedIn]);

  if (signedIn) return null;

  const message = t(`auth.states.${state}`);

  return (
    <>
      <DraggableWindow
        id="extension-login"
        isOpen={open}
        title={t("auth.windowTitle")}
        resizable={false}
        minWidth={size.width}
        maxWidth={360}
        widthMode="fit-content"
        minHeight={size.height}
        dynamicHeight
        contentClassName="ll:min-h-0"
        onClose={() => setOpen("extension-login", false)}
      >
        <section
          aria-label={t("auth.windowTitle")}
          aria-busy={busy}
          className="ll:flex ll:h-full ll:min-h-0 ll:flex-col ll:text-xs"
        >
          <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:gap-2 ll:overflow-auto ll:p-3">
            <p
              role="status"
              className="ll:m-0 ll:flex ll:items-start ll:gap-1.5 ll:leading-relaxed ll:text-gray-200"
            >
              {busy ? (
                <Spinner className="ll:mt-0.5 ll:size-3.5 ll:shrink-0" />
              ) : null}
              {message}
            </p>
            {state === "cookiesBlocked" ? (
              <>
                <p className="ll:m-0 ll:leading-relaxed ll:text-gray-300">
                  {t(`auth.cookieGuidance.${detectCookieBrowser()}`)}
                </p>
                <p className="ll:m-0 ll:leading-relaxed ll:text-gray-300">
                  <a
                    className="ll:text-blue-300 ll:underline ll:underline-offset-2 ll:focus-visible:outline-2"
                    href={`${LOOTLOG_APP_URL}/docs/faq`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("auth.cookieGuidance.helpLink")}
                  </a>
                </p>
              </>
            ) : null}
          </div>
          <WindowFooter rowClassName="ll:justify-end ll:gap-1 ll:px-3">
            <Button
              variant="secondary"
              size="xs"
              loading={busy}
              onClick={() => void session.refetch()}
            >
              {t("auth.check")}
            </Button>
            <Button
              size="xs"
              render=<a
                href={LOOTLOG_APP_URL}
                target="_blank"
                rel="noopener"
                onClick={markLoginWebsiteOpened}
              />
            >
              {t("auth.openWebsite")}
            </Button>
          </WindowFooter>
        </section>
      </DraggableWindow>
      {open ? null : (
        <WindowLauncher
          icon={LogIn}
          label={t("auth.openLogin")}
          besideQuickAccess={!extension}
          onOpen={() => openAndFocus("extension-login")}
        />
      )}
    </>
  );
}
