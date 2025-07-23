import React, { createContext, useCallback, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useGlobalStore } from "@/store/global.store";
import { Game } from "@/lib/game";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined
);
GatewayContext.displayName = "GatewayContext";

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  const { gameState } = useGlobalStore((state) => state);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);

  const setupBaseListeners = useCallback(() => {
    socket.on(GatewayEvent.CONNECT, () => {
      setConnected(true);
    });

    socket.on(GatewayEvent.DISCONNECT, () => {
      setConnected(false);
    });

    socket.on(GatewayEvent.JOIN, (data) => {
      if (data.status === "error") {
        console.error("Join error:", data.message);
        return;
      }

      setJoined(true);
    });

    return () => {
      socket.off(GatewayEvent.CONNECT);
      socket.off(GatewayEvent.DISCONNECT);
    };
  }, []);

  const emitJoin = useCallback(() => {
    const { world, gameInitialized, characterId, accountId } = gameState;

    if (connected && gameInitialized) {
      socket.emit(GatewayEvent.JOIN, {
        data: {
          world,
          name: Game.hero.nick,
          lvl: Game.hero.lvl,
          icon: Game.hero.img,
          prof: Game.hero.prof,
          characterId,
          accountId,
          location: {
            x: Game.hero.x,
            y: Game.hero.y,
            map: Game.map.name,
          },
        },
      });
    }
  }, [connected, gameState]);

  useEffect(() => {
    const cleanup = setupBaseListeners();
    if (!socket.connected) {
      socket.connect();
    }

    return cleanup;
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
    joined,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
