import type { ApiEventCallback } from "@lootlog/margonem/api";
import type { Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";

const AFTER_CHARACTER_TIP_UPDATE = "afterCharacterTipUpdate";

type StrTipData = { nick: string; object?: unknown };

/**
 * The NI tooltip contract: OthersManager.createStrTip builds the base html,
 * passes `{ text, object }` to afterCharacterTipUpdate handlers through
 * Api.callEvent and returns the possibly replaced `text`. Other.tipUpdate
 * caches that html in `other.tip`, which CanvasTip.show draws.
 */
export function createNativeCharacterTips() {
  const handlers: ApiEventCallback[] = [];

  const api = {
    addCallbackToEvent: (event: string, callback: ApiEventCallback) => {
      if (event !== AFTER_CHARACTER_TIP_UPDATE) return;

      if (handlers.includes(callback)) {
        throw new Error("this callback already exist");
      }

      handlers.push(callback);
    },
    removeCallbackFromEvent: (event: string, callback: ApiEventCallback) => {
      const index = handlers.indexOf(callback);

      if (event !== AFTER_CHARACTER_TIP_UPDATE || index === -1) {
        throw new Error("No callback found");
      }

      handlers.splice(index, 1);
    },
  };

  const createStrTip = ({ nick, object }: StrTipData): string => {
    const tipObj: CharacterTipUpdate = { text: `<div>${nick}</div>`, object };

    for (const handler of handlers) handler(tipObj);

    return tipObj.text;
  };

  const createOther = (nick: string, id = nick): Other => {
    const other: Other & { canvasObjectType: string } = {
      canvasObjectType: "OTHER",
      d: { account: 1, icon: "other.gif", id, lvl: 300, nick, prof: "w" },
    };

    other.tipUpdate = () => {
      other.tip = [
        createStrTip({ nick: other.d.nick, object: other }),
        "t_other",
      ];
    };

    return other;
  };

  return {
    api,
    apiData: { AFTER_CHARACTER_TIP_UPDATE },
    createOther,
    createStrTip,
    handlerCount: () => handlers.length,
  };
}
