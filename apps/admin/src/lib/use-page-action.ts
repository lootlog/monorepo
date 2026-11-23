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

  const run = async (action: Action) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(action);

    try {
      const refusal = await perform(action);

      await router.invalidate();
      await report(refusal ? { error: refusal } : { notice: action.action });
    } catch {
      await report({ error: "failed" });
    } finally {
      inFlight.current = false;
      setPending(undefined);
    }
  };

  return { run, pending };
}
