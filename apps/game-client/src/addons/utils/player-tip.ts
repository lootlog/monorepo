export type PlayerTipOptions = Record<string, unknown>;
export type PlayerTipTuple = [
  content: string,
  tipType: string,
  options?: PlayerTipOptions,
];

export type PlayerTipTarget = {
  tip?: unknown;
};

const TIP_ROOT_ID = "ll-player-tip-root";

const isPlayerTipOptions = (value: unknown): value is PlayerTipOptions => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const cloneTipTuple = (tip: PlayerTipTuple): PlayerTipTuple => {
  return [tip[0], tip[1], tip[2] ? { ...tip[2] } : undefined];
};

const parseTipRoot = (content: string) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    `<div id="${TIP_ROOT_ID}">${content}</div>`,
    "text/html",
  );
  const root = document.getElementById(TIP_ROOT_ID);

  if (!root) {
    return null;
  }

  return { document, root };
};

export const readPlayerTipTuple = (
  target: PlayerTipTarget,
): PlayerTipTuple | null => {
  if (!Array.isArray(target.tip)) {
    return null;
  }

  const [content, tipType, options] = target.tip;
  if (typeof content !== "string" || typeof tipType !== "string") {
    return null;
  }

  return [
    content,
    tipType,
    isPlayerTipOptions(options) ? { ...options } : undefined,
  ];
};

export const writePlayerTipTuple = (
  target: PlayerTipTarget,
  tip: PlayerTipTuple,
): void => {
  const nextTip = cloneTipTuple(tip);
  target.tip = nextTip[2] ? nextTip : [nextTip[0], nextTip[1]];
};

export const updatePlayerTipTuple = (
  target: PlayerTipTarget,
  updater: (tip: PlayerTipTuple) => PlayerTipTuple,
): boolean => {
  const currentTip = readPlayerTipTuple(target);
  if (!currentTip) {
    return false;
  }

  const nextTip = cloneTipTuple(updater(cloneTipTuple(currentTip)));
  const isContentChanged = currentTip[0] !== nextTip[0];
  const isTypeChanged = currentTip[1] !== nextTip[1];
  const isOptionsChanged =
    JSON.stringify(currentTip[2] ?? null) !== JSON.stringify(nextTip[2] ?? null);

  if (!isContentChanged && !isTypeChanged && !isOptionsChanged) {
    return false;
  }

  writePlayerTipTuple(target, nextTip);
  return true;
};

export const upsertPlayerTipSection = (
  target: PlayerTipTarget,
  sectionId: string,
  sectionHtml: string,
): boolean => {
  return updatePlayerTipTuple(target, (tip) => {
    const parsed = parseTipRoot(tip[0]);
    if (!parsed) {
      return tip;
    }

    const { document, root } = parsed;
    const selector = `[data-ll-tip-section="${sectionId}"]`;
    root.querySelectorAll(selector).forEach((node) => node.remove());

    const sectionContainer = document.createElement("div");
    sectionContainer.innerHTML = sectionHtml.trim();
    const sectionElement = sectionContainer.firstElementChild;

    if (!sectionElement) {
      return tip;
    }

    sectionElement.setAttribute("data-ll-tip-section", sectionId);
    root.appendChild(sectionElement);

    return [root.innerHTML, tip[1], tip[2]];
  });
};

export const removePlayerTipSection = (
  target: PlayerTipTarget,
  sectionId: string,
): boolean => {
  return updatePlayerTipTuple(target, (tip) => {
    const parsed = parseTipRoot(tip[0]);
    if (!parsed) {
      return tip;
    }

    const { root } = parsed;
    root
      .querySelectorAll(`[data-ll-tip-section="${sectionId}"]`)
      .forEach((node) => node.remove());

    return [root.innerHTML, tip[1], tip[2]];
  });
};
