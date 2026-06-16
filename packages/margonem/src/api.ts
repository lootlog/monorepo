export type ApiData = {
  NEW_MSG: "newMsg";
  UPDATE_MSG: "updateMsg";
  HERO_UPDATE: "heroUpdate";
  NEW_ASK: "newAsk";
  LOOT_UPDATE: "loot_update";
  AUCTIONS_UPDATE: "auctions_update";
  DEPO_INIT: "depo_init";
  DEPO_UPDATE: "depo_update";
  CLAN_DEPO_INIT: "clan_depo_init";
  CLAN_DEPO_UPDATE: "clan_depo_update";
  HERO_DEAD: "heroDead";
  CALL_DRAW_UPDATE: "call_draw_update";
  CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer";
  SHOW_CLOSE_BATTLE: "show_close_battle";
  CLOSE_BATTLE: "close_battle";
  OPEN_BATTLE_WINDOW: "open_battle_window";
  UPDATE_WARRIOR: "updateWarrior";
  NEW_WARRIOR: "newWarrior";
  HERO_MOVE: "heroMove";
  AFTER_CHARACTER_TIP_UPDATE: "afterCharacterTipUpdate";
  REMOVE_NPC: "removeNpc";
  NEW_NPC: "newNpc";
  CLEAR_MAP_NPCS: "clear_map_npcs";
  REMOVE_OTHER: "removeOther";
  NEW_OTHER: "newOther";
  UPDATE_OTHER: "updateOther";
  ITEM_USED: "itemUsed";
  AFTER_INTERFACE_START: "afterInterfaceStart";
};

export type ApiEventName = ApiData[keyof ApiData];

export type Api = {
  callEvent: (eventName: ApiEventName, eventData?: unknown) => void;
  addCallbackToEvent: (
    eventName: ApiEventName,
    callback: (eventData: unknown) => void,
  ) => void;
  removeCallbackFromEvent: (
    eventName: ApiEventName,
    callback: (eventData: unknown) => void,
  ) => void;
  getData: (eventName: ApiEventName) => unknown;
};
