import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { io, type Socket } from "socket.io-client";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  initialState?: Record<string, unknown>;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

export function render(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export interface MockSocket extends Socket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}

export function createMockSocket(): MockSocket {
  const socket = {
    id: "test-socket-id",
    connected: true,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    listenerCount: vi.fn((event: string) => {
      const listeners = socket._listeners.get(event);
      return listeners ? listeners.length : 0;
    }),
    _listeners: new Map<string, Array<(...args: unknown[]) => void>>(),
  } as unknown as MockSocket;

  socket.on.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      if (!socket._listeners.has(event)) {
        socket._listeners.set(event, []);
      }
      socket._listeners.get(event)?.push(handler);
      return socket;
    },
  );

  socket.off.mockImplementation(
    (event: string, handler?: (...args: unknown[]) => void) => {
      if (handler) {
        const listeners = socket._listeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(handler);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
      } else {
        socket._listeners.delete(event);
      }
      return socket;
    },
  );

  socket.emit.mockImplementation((event: string, ...args: unknown[]) => {
    const listeners = socket._listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
    return socket;
  });

  return socket;
}

export function renderWithSocket(
  ui: ReactElement,
  options: CustomRenderOptions & { socket?: MockSocket } = {},
) {
  const socket = options.socket || createMockSocket();
  const queryClient = options.queryClient || createTestQueryClient();

  return {
    ...render(ui, { ...options, queryClient }),
    socket,
    queryClient,
  };
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
