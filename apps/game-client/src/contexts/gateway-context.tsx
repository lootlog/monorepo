import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

//   import { emitter } from 'eventEmitter';
import io, { Socket } from "socket.io-client";

//   import { usePrivateChannels } from '../hooks/api/usePrivateChannels';
//   import { useServers } from '../hooks/api/useServers';
//   import { useAuthToken } from 'hooks/api/useAuthToken';
import { GATEWAY_URL, GatewayEvent } from "@/config/gateway";
import { useAuthToken } from "@/hooks/auth/use-auth-token";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useGlobalContext } from "@/contexts/global-context";

export type GatewayProviderValue = {
  connected: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayProvider: React.FC<Props> = (props) => {
  const token = useAuthToken();
  const { initialized } = useGlobalContext();
  const { data: guilds } = useGuilds();
  // const { data: servers } = useServers();
  const socketRef = useRef(undefined as unknown as Socket);
  // const { data: channels } = usePrivateChannels();

  const [connected, setConnected] = useState(false);
  const guildIds = useMemo(
    () => (guilds ? guilds?.map((server) => server.id) : null),
    [guilds]
  );
  // const channelIds = useMemo(
  //   () => (channels ? channels?.map(channel => channel.id) : null),
  //   [channels],
  // );

  const setupBaseListeners = useCallback(() => {
    if (token && guildIds && initialized) {
      socketRef.current.on(GatewayEvent.CONNECT, async () => {
        const response = await socketRef.current.emitWithAck(
          GatewayEvent.INIT,
          { token }
        );

        console.log(response);

        socketRef.current.emit(GatewayEvent.JOIN, {
          name: "twoj stary",
          source: "game",
          guildIds,
        });
        setConnected(true);
      });

      // socketRef.current.on(GatewayEvent.SERVER_JOIN, payload => {
      //   console.log(payload);
      //   // setConnected(true);
      //   socketRef.current.on(GatewayEvent.SERVER_MESSAGE_SEND, payload => {
      //     console.log('handling main event', payload);
      //     emitter.emit(GatewayEvent.SERVER_MESSAGE_SEND, payload);
      //   });

      //   socketRef.current.on(GatewayEvent.DIRECT_MESSAGE_SEND, payload => {
      //     console.log('handling main event', payload);
      //     emitter.emit(GatewayEvent.DIRECT_MESSAGE_SEND, payload);
      //   });
      // });

      socketRef.current.on(GatewayEvent.DISCONNECT, () => {
        setConnected(false);
      });
    }
  }, [token, guildIds, initialized]);

  useEffect(() => {
    if (token) {
      const socket = io(GATEWAY_URL, {
        transports: ["websocket"],
      });
      socketRef.current = socket;

      setupBaseListeners();
    }

    return () => {
      socketRef.current?.close?.();
    };
  }, [token, setupBaseListeners]);

  useEffect(() => {
    console.log("Connected to gateway: ", connected);

    // socketRef.current.on(GatewayEvents.SERVER_MESSAGE_SEND, payload => {
    //   console.log(payload);
    // });
  }, [connected]);

  const value: GatewayProviderValue = {
    socket: socketRef.current,
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
