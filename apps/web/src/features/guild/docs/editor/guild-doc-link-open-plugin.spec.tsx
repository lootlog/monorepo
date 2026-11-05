// @vitest-environment happy-dom

import { LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildDocLinkOpenPlugin } from "./guild-doc-link-open-plugin";

// A docs writer controls every attribute of a stored link, including one that
// asks the browser to keep window.opener.
const documentWithLink = JSON.stringify({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: [
          {
            type: "link",
            version: 1,
            url: "https://example.test/",
            rel: "opener",
            target: "_self",
            title: null,
            direction: null,
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text: "Poradnik",
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
              },
            ],
          },
        ],
      },
    ],
  },
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("read-only document links", () => {
  it("open in a new tab without handing the linked page window.opener", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <LexicalComposer
        initialConfig={{
          namespace: "test",
          editable: false,
          nodes: [LinkNode],
          editorState: documentWithLink,
          onError: (error) => {
            throw error;
          },
        }}
      >
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <GuildDocLinkOpenPlugin />
      </LexicalComposer>,
    );

    const link = screen.getByText("Poradnik");
    const click = fireEvent.click(link);

    expect(open).toHaveBeenCalledWith(
      "https://example.test/",
      "_blank",
      "noopener,noreferrer",
    );
    expect(click).toBe(false);
  });
});
