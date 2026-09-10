import { useEffect, useRef, useState } from "react";
import {
  watchIntegratedChatHost,
  type IntegratedChatHost,
} from "@/lib/margonem-runtime/adapters/chat-host-runtime-adapter";

export function useIntegratedChatHost(enabled: boolean, label: string) {
  const [host, setHost] = useState<IntegratedChatHost | null>(null);

  const controller = useRef<ReturnType<typeof watchIntegratedChatHost> | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    controller.current = watchIntegratedChatHost(label, setHost);

    return () => {
      controller.current?.dispose();
      controller.current = null;
      setHost(null);
    };
  }, [enabled, label]);

  return {
    target: enabled ? (host?.target ?? null) : null,
    selected: enabled && (host?.selected ?? false),
    visible: enabled && (host?.visible ?? false),
    select: () => controller.current?.select(),
  };
}
