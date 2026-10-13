// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Users } from "lucide-react";
import { RealtimeRequestError } from "@lootlog/client/realtime";
import { SettingsTableCard } from "@/features/guild/settings/components/settings-table-card";
import { createTestGateway } from "@/lib/testing/gateway";
import { OrganizationPresence } from "@/lib/organization-presence";
import { loadAuthenticatedTranslations } from "@/i18n/config";
import { OrganizationPresenceStatus } from "./organization-presence-status";

await loadAuthenticatedTranslations();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  new Error("timeout"),
  new RealtimeRequestError(
    "COMMAND_REJECTED",
    "organization access denied",
    false,
  ),
])(
  "allows presence recovery above empty member results after %s",
  async (error) => {
    const gateway = createTestGateway();
    gateway.request.mockRejectedValueOnce(error).mockResolvedValueOnce({
      organizationId: "guild",
      revision: 1,
      presences: [],
    });
    render(
      <SettingsTableCard
        title="Members"
        search={{ value: "", placeholder: "Search", onChange: () => {} }}
        isEmpty
        empty={{
          icon: Users,
          title: "No matches",
          description: "No online members",
        }}
        hasActiveFilters
        onResetFilters={() => {}}
        notice={<OrganizationPresenceStatus guildId="guild" />}
      >
        {null}
      </SettingsTableCard>,
      { wrapper: gateway.wrapper },
    );

    const notice = await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await waitFor(() =>
      expect(
        OrganizationPresence.for(gateway.socket, "guild").getSnapshot().status,
      ).toBe("ready"),
    );
    expect(notice.isConnected).toBe(false);
  },
);

it("offers manual fetch recovery only after the gateway is connected and joined", async () => {
  const options = { connected: false, joined: false };
  const gateway = createTestGateway(options);
  gateway.request
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce({
      organizationId: "guild",
      revision: 1,
      presences: [],
    });

  const { rerender } = render(<OrganizationPresenceStatus guildId="guild" />, {
    wrapper: gateway.wrapper,
  });

  expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  expect(gateway.request).not.toHaveBeenCalled();
  options.connected = true;
  rerender(<OrganizationPresenceStatus guildId="guild" />);
  expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  expect(gateway.request).not.toHaveBeenCalled();
  options.joined = true;
  rerender(<OrganizationPresenceStatus guildId="guild" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Spróbuj ponownie" }),
  );
  await waitFor(() =>
    expect(
      OrganizationPresence.for(gateway.socket, "guild").getSnapshot().status,
    ).toBe("ready"),
  );
});
