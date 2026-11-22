import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { AuraAction } from "@/lib/aura-action";
import { performAuraAction } from "@/server/character-auras";

/**
 * Changes the auras of the User who plays one account, reloads what the page
 * shows and reports the outcome above it. `pending` names the change in
 * flight, with the personal aura it grants.
 */
export function useAuraAction(gameAccountId: string) {
  const router = useRouter();
  const navigate = useNavigate({ from: "/auras" });
  const [pending, setPending] = useState<string>();

  const run = async (action: AuraAction) => {
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
      setPending(undefined);
    }
  };

  return { run, pending };
}
