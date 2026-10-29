import type { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { createContext, useContext, type ComponentProps } from "react";
import type { OnlinePlayerTooltip } from "./online-player-tooltip";

export type OnlinePlayerTooltipPayload = ComponentProps<
  typeof OnlinePlayerTooltip
>;

export const OnlinePlayerTooltipContext =
  createContext<BaseTooltip.Handle<OnlinePlayerTooltipPayload> | null>(null);

export const useOnlinePlayerTooltipHandle = () => {
  const handle = useContext(OnlinePlayerTooltipContext);

  if (!handle) {
    throw new Error(
      "useOnlinePlayerTooltipHandle requires OnlinePlayersPopups",
    );
  }

  return handle;
};
