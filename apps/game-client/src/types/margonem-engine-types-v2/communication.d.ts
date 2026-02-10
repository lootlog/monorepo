export interface Communication {
  tmpParams: any[];
  taskCallbacks: {[key: string]: Function | null};
  taskPayload: {[key: string]: any | null};
  taskQueue: string[];
  idleRequestCounter: number;
  heroIdle: boolean;
  
  // Methods
  init(): void;
  initWebSocket(): void;
  checkCanAddTaskToTaskQueue(task: string): boolean;
  checkCanSendTaskFromTaskQueue(): number;
  sendTaskFromQueue(): void;
  addToTaskQueue(task: string, callback?: ((data: any) => void) | null, payload?: object | null): void;
  removeFromTaskQueue(task: string): void;
  send(task: string, callback?: ((data: any) => void) | ((data: any) => void)[], payload?: object): void;
  send2(task: string, callback?: ((data: any) => void) | ((data: any) => void)[], payload?: object): void;
  errorData(e: any): void;
  webSocketVarsClear(): void;
  setGlobalAddonsWasReceived(state: boolean): void;
  getGlobalAddonsWasReceived(): boolean;
  successData(d: string): void;
  onOpenWebSocket(): void;
  startCallInitAfterRecivedAddons(): void;
  onMessageWebSocket(evt: MessageEvent): void;
  getFullDataPackage(): any;
  setFullDataPackage(data: any): void;
  resetFullDataPackage(): void;
  webSocketSendData(getData: string, postData: any): void;
  addParams(param: any, callback: Function): void;
  prepareUrl(): string;
  sendEv(): void;
  manageHeroIdle(inMove: boolean): void;
}
