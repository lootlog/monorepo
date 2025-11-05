import { create } from "zustand";

interface DialogState {
  talkingNpcId: string | null;
}

interface DialogActions {
  setTalkingNpcId: (id: string | null) => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set) => ({
  talkingNpcId: null,

  setTalkingNpcId: (talkingNpcId) => set({ talkingNpcId }),
}));
