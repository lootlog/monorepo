import React, { createContext, useCallback, useEffect, useState } from "react";

import { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useGlobalStore } from "@/store/global.store";

export type GatewayProviderValue = {
  connected: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayProvider: React.FC<Props> = (props) => {
  const { gameInitialized, world, characterName } = useGlobalStore(
    (state) => state.gameState
  );

  const [connected, setConnected] = useState(false);

  const setupBaseListeners = useCallback(async () => {
    socket.on(GatewayEvent.CONNECT, () => {
      setConnected(true);
    });

    socket.on(GatewayEvent.DISCONNECT, () => {
      setConnected(false);
    });
  }, [gameInitialized]);

  const emitJoin = useCallback(() => {
    socket.emit(GatewayEvent.JOIN, {
      name: characterName,
      world,
    });
  }, [world, characterName]);

  useEffect(() => {
    if (gameInitialized) {
      setupBaseListeners();
    }
  }, [gameInitialized]);

  useEffect(() => {
    console.log("Connected to gateway: ", connected);
    if (connected) {
      emitJoin();
    }
  }, [connected]);

  const value: GatewayProviderValue = {
    socket,
    connected,
  };

  return (
    <GatewayContext.Provider value={value} {...props}>
      {props.children}
    </GatewayContext.Provider>
  );
};

export const GatewayContext = createContext<GatewayProviderValue>(
  {} as GatewayProviderValue
);
GatewayContext.displayName = "GatewayContext";
