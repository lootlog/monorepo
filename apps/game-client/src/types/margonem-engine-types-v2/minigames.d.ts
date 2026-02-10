export interface MiniGamesLoader {
  game: any;
  v: any;
  data: any;
  loadedGames: string[];
  
  loadImages(files: any): void;
  setImgLoader(files: any, path: string, amount: any[]): void;
  loadCss(file: string): void;
  initGame(data: any): void;
  loadScripts(data: any): void;
  start(): void;
  task(data: any): void;
  parseMessage(msg: any): void;
  endGame(): void;
  onClear(): void;
  [key: string]: any;
}
