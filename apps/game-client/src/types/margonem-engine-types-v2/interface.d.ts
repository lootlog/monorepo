export interface Interface {
  init(): void;
  get$GAME_CANVAS(): any; // JQuery<HTMLCanvasElement>
  get$MAP_CANVAS(): any; // JQuery<HTMLCanvasElement>
  
  setInterfaceLightMode(state: boolean): void;
  setLighModeByDataInStorage(): void;
  
  get$gameWindowPositioner(): any; // JQuery
  addToGameWindowPositioner($el: any): void;
  
  get$interfaceLayer(): any; // JQuery
  get$tutorialLayer(): any; // JQuery
  
  heroElements: {
    get$expLightMode(): any;
    get$expTopLightMode(): any;
    startLag(): void;
    [key: string]: any;
  };
  
  showBox(data: any): void; // Likely displays a message/dialog
  closeBox(): void;
  
  $iLayer?: any; // Cached JQuery object?
  
  [key: string]: any;
}
