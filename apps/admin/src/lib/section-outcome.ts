import { createContext, use } from "react";

export type SectionOutcome = {
  readonly tone: "ready" | "destructive";
  readonly message: string;
};

export const SectionOutcomeContext = createContext<
  ((outcome: SectionOutcome) => void) | null
>(null);

export function useSectionOutcome() {
  const report = use(SectionOutcomeContext);

  if (report === null)
    throw new Error("A page action must run inside a Section.");

  return report;
}
