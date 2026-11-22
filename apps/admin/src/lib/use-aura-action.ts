import { useNavigate, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { AuraAction } from "@/lib/aura-action";
import { performAuraAction } from "@/server/character-auras";

export function useAuraAction(gameAccountId: string) {
  const router = useRouter();
  const navigate = useNavigate({ from: "/auras" });
  const [pending, setPending] = useState<string>();
  const inFlight = useRef(false);

  const run = async (action: AuraAction) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(
      action.action === "grant-personal" ? action.auraId : action.action,
    );

    try {
      const refusal = await performAuraAction({
        data: { gameAccountId, action },
      });

      await router.invalidate();
      await navigate({
        search: (search) =>
          refusal === undefined
            ? { ...search, notice: action.action, error: undefined }
            : { ...search, notice: undefined, error: refusal },
        replace: true,
      });
    } catch {
      await navigate({
        search: (search) => ({ ...search, notice: undefined, error: "failed" }),
        replace: true,
      });
    } finally {
      inFlight.current = false;
      setPending(undefined);
    }
  };

  return { run, pending };
}
