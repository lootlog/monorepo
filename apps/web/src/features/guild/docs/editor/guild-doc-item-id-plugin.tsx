import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { registerGuildDocItemIdTransform } from "./guild-doc-item-id-transform";

export const GuildDocItemIdPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerGuildDocItemIdTransform(editor), [editor]);

  return null;
};
