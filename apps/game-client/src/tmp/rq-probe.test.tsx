import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";

const useProbe = () => {
  const { data } = useQuery({
    queryKey: ["probe"],
    queryFn: () => Promise.resolve(["fetched"]),
    staleTime: Infinity,
  });

  return data ?? [];
};

it("notifies an enabled settled observer of setQueryData", async () => {
  const client = new QueryClient();
  client.setQueryData(["probe"], ["seeded"]);

  const Probe = () => <span>{useProbe().join(",") || "empty"}</span>;

  render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  expect(screen.getByText("seeded")).toBeInTheDocument();
  act(() => {
    client.setQueryData(["probe"], (old: string[] | undefined) => [
      ...(old ?? []),
      "written",
    ]);
  });
  await waitFor(() =>
    expect(screen.getByText("seeded,written")).toBeInTheDocument(),
  );
});
