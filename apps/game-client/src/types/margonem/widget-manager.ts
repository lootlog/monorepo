export interface WidgetManager {
  getPathToHotWidgetVersion: () => string;
  getFirstEmptyWidgetSlot: () => WidgetFirstSlot;
  setEnableDraggingButtonsWidget: (state: boolean) => void;
  getDefaultWidgetSet: () => Widgets;
  createOneWidget: (
    clName: string,
    storeData: {},
    additionalBarHide: boolean,
    wigdetsWithoutFreeSlot: []
  ) => void;
}

export type Widgets = {
  [key: string]: {};
};

export type WidgetFirstSlot = {
  slot: number;
  container: string;
};
