import { useTranslation } from "react-i18next";
import { useWindowsStore } from "@/store/windows.store";
import { clearCommandDraft } from "./command-draft";
import { CommandComposer } from "./components/command-composer";
import { CommandOverlay } from "./components/command-overlay";

export const CommandWindow = () => {
  const { t } = useTranslation("command");
  const open = useWindowsStore((state) => state.command.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const close = () => setOpen("command", false);

  return (
    <CommandOverlay
      open={open}
      label={t("window.title")}
      onDismiss={close}
      onEscape={() => {
        clearCommandDraft();
        close();
      }}
    >
      <CommandComposer onClose={close} />
    </CommandOverlay>
  );
};
