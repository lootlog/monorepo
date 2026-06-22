import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

type GuildDocEditorEditablePluginProps = {
  editable: boolean;
};

export const GuildDocEditorEditablePlugin = ({
  editable,
}: GuildDocEditorEditablePluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(editable);
  }, [editable, editor]);

  return null;
};
