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

// 1. Najpierw zdefiniuj kontekst
export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined
);
GatewayContext.displayName = "GatewayContext";

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  const { gameInitialized, world, characterName } = useGlobalStore(
    (state) => state.gameState
  );
  const [connected, setConnected] = useState<boolean>(false);

  const setupBaseListeners = useCallback(() => {
    socket.on(GatewayEvent.CONNECT, () => {
      setConnected(true);
    });

    socket.on(GatewayEvent.DISCONNECT, () => {
      setConnected(false);
    });

    // Czyścimy eventy po odmontowaniu komponentu
    return () => {
      socket.off(GatewayEvent.CONNECT);
      socket.off(GatewayEvent.DISCONNECT);
    };
  }, []);

  const emitJoin = useCallback(() => {
    if (connected && world) {
      socket.emit(GatewayEvent.JOIN, {
        name: characterName,
        world,
      });
    }
  }, [connected, world]);

  useEffect(() => {
    const cleanup = setupBaseListeners();
    if (!socket.connected) {
      socket.connect();
    }

    return cleanup; // Clean up event listeners when component unmounts
  }, []);

  useEffect(() => {
    if (connected) {
      emitJoin();
      console.log("Connected to gateway:", connected);
    }
  }, [connected, emitJoin]);

  const value: GatewayProviderValue = {
    connected,
    socket,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
