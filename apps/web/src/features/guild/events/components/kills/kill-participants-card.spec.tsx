// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { KillParticipantsCard } from "./kill-participants-card";

await initializeTestTranslations();

afterEach(cleanup);

describe("KillParticipantsCard", () => {
  it("renders the empty participant state without analytical rows", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KillParticipantsCard participants={[]} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("events.kills.noParticipants")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "events.kills.expandParticipant",
      }),
    ).toBeNull();
  });
});
