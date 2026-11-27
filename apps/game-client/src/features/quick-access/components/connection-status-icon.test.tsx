import { render } from "@testing-library/react";
import { Wifi } from "lucide-react";
import { expect, it } from "vitest";
import { ConnectionStatusIcon } from "./connection-status-icon";

it("keeps a single status icon through repeated submission signals", () => {
  const view = render(
    <ConnectionStatusIcon
      Icon={Wifi}
      className=""
      recoveryCount={0}
      signalCount={0}
      feedback={null}
    />,
  );

  for (let sequence = 1; sequence <= 3; sequence += 1) {
    view.rerender(
      <ConnectionStatusIcon
        Icon={Wifi}
        className=""
        recoveryCount={0}
        signalCount={sequence}
        feedback={{ sequence, kind: "loot", outcome: "logged" }}
      />,
    );
  }

  expect(view.container.querySelectorAll("svg")).toHaveLength(1);
});
