export interface BuildsManager {
  init(): void;
  updateData(data: any): void;
  getBuildsWindow(): any;
  getBuildsHandheldWindow(): any;
  getBuildsRequests(): any;
  getBuildsCommons(): any;
  manageBuildsHotkeys(key: string): void;
  changeDefaultNameIfExist(name: string): string;
  [key: string]: any;
}
