// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { StatisticsQueryPanel } from "./statistics-query-panel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);

function Panel({ fetchData }: { fetchData: () => Promise<string> }) {
  const query = useQuery({
    queryKey: ["panel"],
    queryFn: fetchData,
    retry: false,
  });
  return (
    <StatisticsQueryPanel query={query}>
      <p>{query.data ?? "loading"}</p>
    </StatisticsQueryPanel>
  );
}

it("shows a failed panel and retries it instead of rendering missing data", async () => {
  const client = new QueryClient();
  const fetchData = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue("loaded");
  render(
    <QueryClientProvider client={client}>
      <Panel fetchData={fetchData} />
    </QueryClientProvider>,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("loading")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "common.actions.retry" }));
  await screen.findByText("loaded");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(fetchData).toHaveBeenCalledTimes(2);
  client.clear();
});

it("keeps cached results visible and marks them stale after failed refresh", async () => {
  const client = new QueryClient();
  client.setQueryData(["panel"], "cached result");
  render(
    <QueryClientProvider client={client}>
      <Panel
        fetchData={async () => {
          throw new Error("offline");
        }}
      />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByText("cached result")).toBeTruthy();
  expect(screen.getByText("battlePanel.statistics.staleData")).toBeTruthy();
  client.clear();
});
