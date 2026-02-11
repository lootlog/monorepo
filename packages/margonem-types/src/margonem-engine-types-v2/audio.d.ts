import { Npc } from './npcs';
import { Other } from './others';

export interface SoundManager {
  init(): void;
  createMusic(newBg?: string): void;
  setMusic(forceFadeOutIfExist?: boolean): void;
  checkMusicExist(): boolean;
  getMusicDataKeyByTownBgFile(): string;
  createSrajSound(newKey: string, rajSound: any): void;
  prepareSrajSound(url: string): void;
  checkSrajSoundIsPlaying(soundId: string): boolean;
  finishPlayingSrajSound(id: string): void;
  addSrajMapMusic(id: string, file: string, group: any): void;
  removeSrajMapMusic(id: string): void;
  manageNpcNotifications(npc: Npc): void;
  manageOtherNotifications(other: Other): void;
  
  // Settings
  setDataSettingPlay(val: boolean): void;
  setDataSettingQuality(val: string): void;
  setDataSettingShuffle(val: boolean): void;
  setDataSettingMainVolume(val: number): void;
  setDataSettingVolume(val: number, type: string): void;
  getDataSettingVolume(type: string): number;
  getDataSettingMainVolume(): number;
  getDataSettingQuality(): string;
  getDataSettingShuffle(): boolean;
  getDataSettingPlay(): boolean;
  
  [key: string]: any;
}
