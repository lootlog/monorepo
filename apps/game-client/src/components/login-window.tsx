import { LogIn } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LOOTLOG_APP_URL } from "@/config/app";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { WindowLauncher } from "@/components/window-launcher";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { detectCookieBrowser } from "@/hooks/auth/detect-cookie-browser";
import {
  startLoginHandoff,
  useLoginHandoffStore,
} from "@/hooks/auth/login-handoff";
import type { LoginState } from "@/hooks/auth/login-state";
import { useLoginState } from "@/hooks/auth/use-login-state";
import { authClient } from "@/lib/auth-client";
import { isExtensionClient } from "@/lib/game-client-platform";
import { useWindowsStore } from "@/store/windows.store";

const BUSY_STATES = new Set<LoginState>(["checking", "connecting"]);

/**
 * The single sign-in surface of both installations. The extension reads the
 * first-party session through its background worker, so the player signs in
 * on the website; the userscript signs in through a popup handoff that also
 * works when the browser blocks third-party cookies.
 */
export function LoginWindow() {
  const { t } = useTranslation("common");
  const { state, session, handoff } = useLoginState();
  const extension = isExtensionClient();
  const open = useWindowsStore((windows) => windows["extension-login"].open);
  const size = useWindowsStore((windows) => windows["extension-login"].size);
  const setOpen = useWindowsStore((windows) => windows.setOpen);
  const openAndFocus = useWindowsStore((windows) => windows.openAndFocus);
  const signedIn = state === "signedIn";
  const busy = BUSY_STATES.has(state);

  // Coming back from the login popup or the website tab focuses this window
  // without changing its visibility, which is all Better Auth listens to.
  useEffect(() => {
    if (signedIn) return;

    const recheck = () => {
      const { status } = useLoginHandoffStore.getState().handoff;

      if (status !== "exchanging" && status !== "exchanged")
        authClient.$store.notify("$sessionSignal");
    };

    window.addEventListener("focus", recheck);

    return () => window.removeEventListener("focus", recheck);
  }, [signedIn]);

  if (signedIn) return null;

  const message =
    state === "signedOut" && extension
      ? t("auth.states.signedOutExtension")
      : t(`auth.states.${state}`);

  let primaryAction: ReactNode = (
    <Button
      size="xs"
      loading={state === "connecting"}
      disabled={state === "checking"}
      onClick={startLoginHandoff}
    >
      {t("auth.signIn")}
    </Button>
  );

  if (extension)
    primaryAction = (
      <Button
        size="xs"
        render=<a href={LOOTLOG_APP_URL} target="_blank" rel="noopener" />
      >
        {t("auth.openWebsite")}
      </Button>
    );
  else if (handoff.status === "waiting" && handoff.popupBlocked)
    primaryAction = (
      // The web app answers through `window.opener`, so this link keeps it.
      <Button
        size="xs"
        render=<a href={handoff.url} target="_blank" rel="opener" />
      >
        {t("auth.openPopup")}
      </Button>
    );

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
              loading={state === "checking"}
              disabled={state === "connecting"}
              onClick={() => void session.refetch()}
            >
              {t("auth.check")}
            </Button>
            {primaryAction}
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
