import { create } from "zustand";

export type SandboxLogEntry = {
  id: number;
  at: Date;
  kind: "inbound" | "outbound" | "message";
  text: string;
};

type SandboxLogState = {
  entries: SandboxLogEntry[];
  clear: () => void;
};

const MAX_ENTRIES = 50;

let nextId = 1;

export const useSandboxLog = create<SandboxLogState>((set) => ({
  entries: [],
  clear: () => set({ entries: [] }),
}));

export function logSandbox(kind: SandboxLogEntry["kind"], text: string): void {
  const entry = { id: nextId++, at: new Date(), kind, text };

  useSandboxLog.setState((state) => ({
    entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
  }));
}
