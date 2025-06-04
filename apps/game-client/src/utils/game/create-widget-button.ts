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
  left?: number;
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
  top = 512,
  left = 164,
}: SIWidgetButtonOptions) => {
  const container = document.querySelector("#panel");
  if (!container) return;

  const button = document.createElement("div");
  button.onclick = callback;

  button.classList.add("b_buttons");
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
  button.setAttribute("tip", tooltip);

  container.appendChild(button);
};
