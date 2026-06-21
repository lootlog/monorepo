import type { KeyboardEvent, MouseEvent } from "react";

export const stopBattleTableAction = (event: MouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

export const stopBattleTableKeyboardAction = (
  event: KeyboardEvent<HTMLElement>,
) => {
  event.stopPropagation();
};
