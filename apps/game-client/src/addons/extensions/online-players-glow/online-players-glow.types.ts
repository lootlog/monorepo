export type RuntimeOther = {
  d?: {
    id?: string | number;
    account?: string | number;
    whoIsHere?: string;
  };
  tip?: unknown;
  onUpdate?: {
    whoIsHere?: (value: string) => void;
  };
  whoIsHere?: string | ((value: string) => void);
  whoIsHereGlow?: {
    updateColor?: (value: string) => void;
  };
  imgLoaded?: boolean;
  updateWhoIsHereGlow?: () => void;
};

export type AppliedGlow = {
  previousWhoIsHere: RuntimeOther["whoIsHere"];
  hadWhoIsHere: boolean;
  previousDataWhoIsHere: string | undefined;
  hadDataWhoIsHere: boolean;
  other: RuntimeOther;
};

export type LootlogGuildActivityStatus = "both" | "partial" | "none";

export type PresenceLootlogGuildStatus = {
  timersEnabled: boolean;
  lootEnabled: boolean;
};

export type AddonPresenceGuildEntry = {
  guildId: string;
  label: string;
  status: LootlogGuildActivityStatus;
  color: string;
};

export type AddonPresenceData = {
  guildEntries: AddonPresenceGuildEntry[];
};

export type CharacterTipUpdatePayload = {
  text?: string;
  object?: RuntimeOther;
};

export type EngineWithApiData = Window["Engine"] & {
  apiData?: {
    AFTER_CHARACTER_TIP_UPDATE?: string;
  };
};

export type JQueryLikeCollection<T> = {
  [index: number]: T;
  length?: number;
  tip?: (content: unknown, tipType?: string) => void;
  addClass?: (value: string) => void;
  removeClass?: (value: string) => void;
};

export type WhoIsHereEntry = {
  $?: {
    find?: (
      selector: string,
    ) => JQueryLikeCollection<unknown> | null | undefined;
    addClass?: (value: string) => void;
    removeClass?: (value: string) => void;
  };
};

export type MiniMapOtherController = {
  getObject?: (characterId: string | number) => unknown;
  createTipToOther?: (object: unknown) => void;
};

export type WhoIsHereTipCharacter = {
  createStrTip?: () => string;
  getImg?: () => string;
  tipUpdate?: () => void;
};

export type EngineWithWhoIsHereTips = {
  whoIsHere?: {
    getWhoIsHereOther?: (
      characterId: string,
    ) => WhoIsHereEntry | null | undefined;
    createTipWrapper?: (
      tipContainer: JQueryLikeCollection<unknown>,
      character: WhoIsHereTipCharacter,
    ) => void;
  };
  others?: {
    getById?: (id: string | number) => unknown;
  };
  miniMapController?: {
    handHeldMiniMapController?: {
      getMiniMapOtherController?: () =>
        | MiniMapOtherController
        | null
        | undefined;
    };
  };
};

export type ApiWithCallbacks = {
  addCallbackToEvent: (
    eventName: string,
    callback: (payload: CharacterTipUpdatePayload) => void,
  ) => void;
  removeCallbackFromEvent: (
    eventName: string,
    callback: (payload: CharacterTipUpdatePayload) => void,
  ) => void;
};
