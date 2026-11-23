import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";

export function usePageAction<
  Action extends { readonly action: string },
  Refusal extends string = never,
>(
  perform: (action: Action) => Promise<Refusal | null | void>,
  report: (
    outcome:
      | { readonly notice: Action["action"]; readonly error?: undefined }
      | { readonly error: Refusal | "failed"; readonly notice?: undefined },
  ) => Promise<void>,
) {
  const router = useRouter();
  const [pending, setPending] = useState<Action>();
  const inFlight = useRef(false);

  const settle = async (action: Action): Promise<boolean> => {
    try {
      const refusal = await perform(action);

      await router.invalidate();
      await report(refusal ? { error: refusal } : { notice: action.action });

      return !refusal;
    } catch {
      await report({ error: "failed" });

      return false;
    }
  };

  const attempt = async (action: Action): Promise<boolean> => {
    if (inFlight.current) return false;

    inFlight.current = true;
    setPending(action);

    return settle(action).finally(() => {
      inFlight.current = false;
      setPending(undefined);
    });
  };

  const run = async (action: Action) => {
    await attempt(action);
  };

  return { run, attempt, pending };
}
