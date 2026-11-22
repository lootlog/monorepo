import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export const GuildDocLinkOpenPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const openLink = (event: MouseEvent) => {
      if (editor.isEditable()) return;

      if (event.type === "auxclick" && event.button !== 1) return;

      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a");

      if (!anchor?.href) return;

      event.preventDefault();

      if (window.getSelection()?.isCollapsed === false) return;

      window.open(anchor.href, "_blank", "noopener,noreferrer");
    };

    return editor.registerRootListener((root, previousRoot) => {
      previousRoot?.removeEventListener("click", openLink);
      previousRoot?.removeEventListener("auxclick", openLink);
      root?.addEventListener("click", openLink);
      root?.addEventListener("auxclick", openLink);
    });
  }, [editor]);

  return null;
};
