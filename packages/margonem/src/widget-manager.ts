export interface WidgetManager {
  getPathToHotWidgetVersion: () => string;
  getFirstEmptyWidgetSlot: () => WidgetFirstSlot;
  setEnableDraggingButtonsWidget: (state: boolean) => void;
  getDefaultWidgetSet: () => Widgets;
  createOneWidget: (
    clName: string,
    storeData: Record<string, [index: number, position: string] | false>,
    additionalBarHide: boolean,
    wigdetsWithoutFreeSlot: string[],
  ) => void;
}

/** Fields read by WidgetManager.createOneWidget from its native definition table. */
interface WidgetDefinition {
  default?: boolean;
  index?: number;
  pos?: string;
  txt?: string;
  type?: string;
}

type Widgets = Record<string, WidgetDefinition>;

type WidgetFirstSlot = {
  slot: number;
  container: string;
};
