import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  createContext,
  useContext,
  type ReactNode,
  type PropsWithChildren,
} from "react";

export const createOrganizationTestRouter = (
  content: ReactNode,
  initialEntry = "/guild-1",
) => {
  const root = createRootRoute();
  const organization = createRoute({
    getParentRoute: () => root,
    path: "$guildId",
    component: () => content,
  });
  return createRouter({
    routeTree: root.addChildren([organization]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPendingMinMs: 0,
  });
};

export const createOrganizationTestWrapper = async (
  initialEntry = "/guild-1",
) => {
  const TestContent = createContext<ReactNode>(null);
  function Content() {
    return useContext(TestContent);
  }
  const router = createOrganizationTestRouter(<Content />, initialEntry);
  await router.load();
  return function OrganizationTestWrapper({ children }: PropsWithChildren) {
    return (
      <TestContent.Provider value={children}>
        <RouterProvider router={router} />
      </TestContent.Provider>
    );
  };
};
