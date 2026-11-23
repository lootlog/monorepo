import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useSectionOutcome } from "@/lib/section-outcome";
import { text } from "@/lib/messages";

export function usePageAction<
  Action extends { readonly action: string },
  Refusal extends string = never,
>(
  perform: (action: Action) => Promise<Refusal | null | void>,
  messages: {
    readonly done: (action: Action["action"]) => string;
    readonly refused?: (refusal: Refusal) => string;
  },
) {
  const router = useRouter();
  const report = useSectionOutcome();
  const [pending, setPending] = useState<Action>();
  const inFlight = useRef(false);

  const attempt = async (action: Action): Promise<boolean> => {
    if (inFlight.current) return false;

    inFlight.current = true;
    setPending(action);

    try {
      const refusal = await perform(action);

      await router.invalidate();

      if (refusal) {
        report({
          tone: "destructive",
          message: messages.refused?.(refusal) ?? text.actionFailed,
        });

        return false;
      }

      report({
        tone: "ready",
        message: messages.done(action.action),
      });

      return true;
    } catch {
      report({ tone: "destructive", message: text.actionFailed });

      return false;
    } finally {
      inFlight.current = false;
      setPending(undefined);
    }
  };

  const run = async (action: Action) => {
    await attempt(action);
  };

  return { run, attempt, pending };
}
