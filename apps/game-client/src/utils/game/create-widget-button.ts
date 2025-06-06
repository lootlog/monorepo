export type WidgetButtonOptions = {
  callback: () => void;
  tooltip: string;
  type: "violet" | "green" | "red" | "blue";
  id: string;
  iconUrl?: string;
  top?: number;
  left?: number;
  keyName?: string;
};

export type SIWidgetButtonOptions = {
  callback: () => void;
  tooltip: string;
  letter: string;
  right?: number;
  top?: number;
};

export const createWidgetButton = ({
  callback,
  tooltip,
  type,
  id,
  keyName,
  iconUrl = "https://i.imgur.com/BUCxHlv.png",
}: WidgetButtonOptions) => {
  const serverStoragePos = window.Engine.serverStorage.get(
    window.Engine.widgetManager.getPathToHotWidgetVersion()
  );

  const emptySlot = window.Engine.widgetManager.getFirstEmptyWidgetSlot();
  const emptyWidgetSlot = [emptySlot.slot, emptySlot.container];
  const position = serverStoragePos?.[id]
    ? serverStoragePos[id]
    : emptyWidgetSlot;

  window.Engine.widgetManager.getDefaultWidgetSet()[id] = {
    keyName: keyName ?? id,
    index: position[0],
    pos: position[1],
    txt: tooltip,
    type,
    alwaysExist: true,
    default: true,
    clb: () => callback(),
  };

  const storeData: Record<string, (string | number)[]> = {};
  storeData[id] = position;

  window.Engine.widgetManager.createOneWidget(id, storeData, true, []);
  window.Engine.widgetManager.setEnableDraggingButtonsWidget(false);

  if (!keyName) {
    const iconStyle = document.createElement("style");
    iconStyle.innerHTML = `.main-buttons-container .widget-button .icon.${id} {
            background-image: url(${iconUrl});
            background-position: 50% 50%;
        }`;
    document.head.appendChild(iconStyle);
  }
};

export const createSIWidgetButton = ({
  callback,
  tooltip,
  top = 0,
  right = 0,
  letter = "L",
}: SIWidgetButtonOptions) => {
  const container = document.querySelector("#bground");
  if (!container) return;

  const button = document.createElement("div");
  button.onclick = callback;

  button.style.left = `${right}px`;
  button.style.position = "absolute";
  button.style.top = `${top}px`;
  button.style.zIndex = "500";
  button.setAttribute("tip", tooltip);
  button.className =
    "ll-custom-cursor-pointer ll-h-[24px] ll-w-[24px] ll-bg-gray-600/50 ll-border-solid ll-border ll-border-gray-300/50 ll-flex ll-items-center ll-justify-center ll-font-sans ll-text-sm";

  button.innerHTML = letter;

  container.appendChild(button);
};
