export type WidgetButtonOptions = {
  callback: () => void;
  tooltip: string;
  type: "violet" | "green" | "red" | "blue";
  id: string;
  iconUrl?: string;
};

export const createWidgetButton = ({
  callback,
  tooltip,
  type,
  id,
  iconUrl = "https://i.imgur.com/BUCxHlv.png",
}: WidgetButtonOptions) => {
  const serverStoragePos = window.Engine.serverStorage.get(
    window.Engine.widgetManager.getPathToHotWidgetVersion()
  );

  const emptySlot = window.Engine.widgetManager.getFirstEmptyWidgetSlot();
  const emptyWidgetSlot = [emptySlot.slot, emptySlot.container];
  const lootlog_WidgetPosition = serverStoragePos?.lootlog
    ? serverStoragePos.lootlog
    : emptyWidgetSlot;

  window.Engine.widgetManager.getDefaultWidgetSet().lootlog = {
    keyName: id,
    index: lootlog_WidgetPosition[0],
    pos: lootlog_WidgetPosition[1],
    txt: tooltip,
    type,
    alwaysExist: true,
    default: true,
    clb: () => callback(),
  };

  const storeData: Record<string, (string | number)[]> = {};
  storeData[id] = lootlog_WidgetPosition;

  window.Engine.widgetManager.createOneWidget(id, storeData, true, []);
  window.Engine.widgetManager.setEnableDraggingButtonsWidget(false);

  const iconStyle = document.createElement("style");
  iconStyle.innerHTML = `.main-buttons-container .widget-button .icon.lootlog {
            background-image: url(${iconUrl});
            background-position: 50% 50%;
        }`;
  document.head.appendChild(iconStyle);
};
