import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import {
  chatInputFixture,
  sendRequest,
  mockScrollIntoView,
  render,
  getEditor,
  createSentMessageResponse,
} from "./chat-input.fixtures";
import { ChatInput } from "./chat-input";

describe("ChatInput mentions", () => {
  it("shows suggestions inside the scroll area and inserts the highlighted mention instead of submitting", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@ra");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(
      listbox.closest("[data-ll-scroll-area-viewport]"),
    ).toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(editor.textContent).toBe("@Raid Team ");
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("completes and cycles mention suggestions with Tab", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@ra");

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raid Team ");
    expect(sendRequest).not.toHaveBeenCalled();

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raider ");

    await user.keyboard("{Tab}");
    expect(editor.textContent).toBe("@Raid Team ");
  });

  it("supports keyboard navigation, colored overlay for resolved mentions, and resets dismissed suggestions after the query changes", async () => {
    const user = userEvent.setup();
    const firstRender = render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hej @ra");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(editor.textContent).toBe("hej @Raider ");

    firstRender.unmount();

    render(<ChatInput selectedGuildId="guild-1" />);

    const resetEditor = getEditor();
    await user.click(resetEditor);
    await user.paste("@ra");
    expect(
      screen.getByRole("option", { name: "@Raid Team" }),
    ).toBeInTheDocument();

    const scrollCallsBeforeArrowNavigation =
      mockScrollIntoView.mock.calls.length;

    await user.keyboard("{ArrowDown}");
    expect(mockScrollIntoView.mock.calls.length).toBeGreaterThan(
      scrollCallsBeforeArrowNavigation,
    );
    expect(mockScrollIntoView).toHaveBeenLastCalledWith(
      expect.objectContaining({ block: "nearest" }),
    );

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "@Raid Team" }),
      ).not.toBeInTheDocument();
    });

    await user.paste("i");
    expect(
      screen.getByRole("option", { name: "@Raid Team" }),
    ).toBeInTheDocument();
  });

  it("shows at most five roles and five members in the suggestions list", async () => {
    const user = userEvent.setup();
    chatInputFixture.guildRoles = [
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Role Alpha",
        color: null,
        permissions: [],
      },
      {
        id: "role-2",
        guildId: "guild-1",
        name: "Role Beta",
        color: null,
        permissions: [],
      },
      {
        id: "role-3",
        guildId: "guild-1",
        name: "Role Gamma",
        color: null,
        permissions: [],
      },
      {
        id: "role-4",
        guildId: "guild-1",
        name: "Role Delta",
        color: null,
        permissions: [],
      },
      {
        id: "role-5",
        guildId: "guild-1",
        name: "Role Epsilon",
        color: null,
        permissions: [],
      },
      {
        id: "role-6",
        guildId: "guild-1",
        name: "Role Zeta",
        color: null,
        permissions: [],
      },
    ];
    chatInputFixture.guildMembers = [
      { id: 1, userId: "user-1", name: "Member Alpha", color: null },
      { id: 2, userId: "user-2", name: "Member Beta", color: null },
      { id: 3, userId: "user-3", name: "Member Gamma", color: null },
      { id: 4, userId: "user-4", name: "Member Delta", color: null },
      { id: 5, userId: "user-5", name: "Member Epsilon", color: null },
      { id: 6, userId: "user-6", name: "Member Zeta", color: null },
    ];

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@");

    expect(screen.getAllByRole("option")).toHaveLength(10);
    expect(
      screen.queryByRole("option", { name: "@Role Zeta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "@Member Zeta" }),
    ).not.toBeInTheDocument();
  });

  it("keeps resolved mentions atomic and serializes them as plain chat text", async () => {
    const user = userEvent.setup();
    sendRequest.mockResolvedValue(Response.json(createSentMessageResponse()));
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("@Raider ");

    const mention = editor.querySelector("[data-chat-mention='raider']");

    expect(mention).toHaveTextContent("@Raider");

    await user.keyboard("{Control>}{Backspace}{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });

    await user.paste("@ra");
    await user.keyboard("{Enter}{Enter}");
    await waitFor(() => {
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });
    expect(sendRequest.mock.calls[0]?.[1]?.body).toContain(
      '"message":"@Raid Team "',
    );
  });
});
