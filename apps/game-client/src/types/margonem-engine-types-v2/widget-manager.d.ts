export interface WidgetManager {
  init(): void;
  // Common widget methods
  createWidget(data: any): any;
  getWidget(id: string): any;
  deleteWidget(id: string): void;
  [key: string]: any;
}
