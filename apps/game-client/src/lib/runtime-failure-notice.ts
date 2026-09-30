import { getFixedT } from "@/i18n/get-fixed-t";

export type RuntimeFailureKind =
  | "gameConnection"
  | "extensionReplaced"
  | "extensionInvalidated"
  | "extensionUnavailable";

const NOTICE_ID = "lootlog-runtime-notice";

// The overlay and its stylesheet tokens are gone once the runtime is disposed,
// so the notice styles itself inline. The values mirror a Lootlog window at
// the darkest opacity: white text, a translucent white rule and a 10px radius.
const NOTICE_STYLE: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  top: "68px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: "10000",
  boxSizing: "border-box",
  width: "min(360px, calc(100vw - 32px))",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  background: "rgb(0, 0, 0)",
  boxShadow: "2px 2px 3px 3px rgba(12, 13, 13, 0.4)",
  color: "rgb(255, 255, 255)",
  font: "12px/16px Arimo, Calibri, Segoe, sans-serif",
  textAlign: "left",
};

const BUTTON_STYLE: Partial<CSSStyleDeclaration> = {
  boxSizing: "border-box",
  height: "24px",
  padding: "0 8px",
  borderRadius: "6px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  background: "transparent",
  color: "inherit",
  font: "500 12px/16px Arimo, Calibri, Segoe, sans-serif",
  cursor: "pointer",
};

const PRIMARY_BUTTON_STYLE: Partial<CSSStyleDeclaration> = {
  ...BUTTON_STYLE,
  borderColor: "transparent",
  background: "rgb(235, 235, 235)",
  color: "rgb(38, 38, 38)",
};

const createElement = <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  style: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElementTagNameMap[Tag] => {
  const element = document.createElement(tag);
  Object.assign(element.style, style);

  if (text !== undefined) element.textContent = text;

  return element;
};

/**
 * Tells the player that Lootlog stopped after its overlay was torn down, and
 * offers a reload and the diagnostics text. Plain DOM with inline styles: it
 * must work without React or the Lootlog stylesheet, and it never touches
 * Margonem globals.
 */
export const showRuntimeFailureNotice = (
  kind: RuntimeFailureKind,
  diagnostics: string,
): void => {
  try {
    document.getElementById(NOTICE_ID)?.remove();
    const t = getFixedT("common");
    const notice = createElement("div", NOTICE_STYLE);
    notice.id = NOTICE_ID;
    notice.setAttribute("role", "alert");

    // Presses on the notice belong to Lootlog, not to the game underneath.
    for (const type of ["pointerdown", "mousedown", "click", "keydown"])
      notice.addEventListener(type, (event) => event.stopPropagation());

    const title = createElement(
      "p",
      { margin: "0", fontWeight: "600" },
      t(`runtimeNotice.${kind}.title`),
    );

    const description = createElement(
      "p",
      { margin: "4px 0 0", color: "rgba(255, 255, 255, 0.7)" },
      t(`runtimeNotice.${kind}.description`),
    );

    const actions = createElement("div", {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: "6px",
      marginTop: "12px",
    });

    const dismiss = createElement(
      "button",
      BUTTON_STYLE,
      t("runtimeNotice.dismiss"),
    );

    dismiss.type = "button";
    dismiss.addEventListener("click", () => notice.remove());

    const copy = createElement("button", BUTTON_STYLE, t("diagnostics.copy"));
    copy.type = "button";
    copy.addEventListener("click", () => {
      Promise.resolve(diagnostics)
        .then((text) => navigator.clipboard.writeText(text))
        .then(
          () => {
            copy.textContent = t("diagnostics.copied");
          },
          () => {
            copy.textContent = t("diagnostics.copyFailed");
          },
        );
    });

    const reload = createElement(
      "button",
      PRIMARY_BUTTON_STYLE,
      t("runtimeNotice.reload"),
    );

    reload.type = "button";
    reload.addEventListener("click", () => window.location.reload());

    actions.append(dismiss, copy, reload);
    notice.append(title, description, actions);
    document.body.append(notice);
  } catch {
    // A failure notice must never affect the game.
  }
};
