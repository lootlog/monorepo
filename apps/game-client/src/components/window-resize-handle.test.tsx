import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WindowResizeHandle } from "@/components/window-resize-handle";

const originalOffsetWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLDivElement.prototype,
  "offsetWidth",
);
const originalOffsetHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLDivElement.prototype,
  "offsetHeight",
);

const renderResizeHandle = ({
  allowHorizontalResize = true,
  allowVerticalResize = true,
}: {
  allowHorizontalResize?: boolean;
  allowVerticalResize?: boolean;
}) => {
  const handleResize = vi.fn();

  Object.defineProperty(HTMLDivElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 200,
  });
  Object.defineProperty(HTMLDivElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 130,
  });

  const { container } = render(
    <div data-testid="window-root">
      <div>
        <WindowResizeHandle
          minWidth={120}
          minHeight={80}
          allowHorizontalResize={allowHorizontalResize}
          allowVerticalResize={allowVerticalResize}
          onResize={handleResize}
          onResizeStart={vi.fn()}
          onResizeEnd={vi.fn()}
        />
      </div>
    </div>,
  );

  const windowRoot = container.querySelector('[data-testid="window-root"]');
  const resizeHandle = container.querySelector(
    "[data-ll-window-resize-handle]",
  );

  if (!(windowRoot instanceof HTMLDivElement)) {
    throw new Error("Expected resize handle root");
  }

  if (!(resizeHandle instanceof HTMLDivElement)) {
    throw new Error("Expected resize handle");
  }

  return {
    handleResize,
    resizeHandle,
  };
};

describe("WindowResizeHandle", () => {
  afterEach(() => {
    if (originalOffsetWidthDescriptor) {
      Object.defineProperty(
        HTMLDivElement.prototype,
        "offsetWidth",
        originalOffsetWidthDescriptor,
      );
    }

    if (originalOffsetHeightDescriptor) {
      Object.defineProperty(
        HTMLDivElement.prototype,
        "offsetHeight",
        originalOffsetHeightDescriptor,
      );
    }
  });

  it("blocks vertical resizing when vertical axis is disabled", () => {
    const { handleResize, resizeHandle } = renderResizeHandle({
      allowVerticalResize: false,
    });

    expect(resizeHandle.style.cursor).toBe("ew-resize");

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { buttons: 1, clientX: 140, clientY: 150 });
    fireEvent.mouseUp(document);

    expect(handleResize).toHaveBeenLastCalledWith({
      width: 240,
      height: 130,
    });
  });

  it("blocks horizontal resizing when horizontal axis is disabled", () => {
    const { handleResize, resizeHandle } = renderResizeHandle({
      allowHorizontalResize: false,
    });

    expect(resizeHandle.style.cursor).toBe("ns-resize");

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { buttons: 1, clientX: 140, clientY: 150 });
    fireEvent.mouseUp(document);

    expect(handleResize).toHaveBeenLastCalledWith({
      width: 200,
      height: 180,
    });
  });

  it("resizes both axes when both directions are enabled", () => {
    const { handleResize, resizeHandle } = renderResizeHandle({});

    expect(resizeHandle.style.cursor).toBe("se-resize");

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { buttons: 1, clientX: 140, clientY: 150 });
    fireEvent.mouseUp(document);

    expect(handleResize).toHaveBeenLastCalledWith({
      width: 240,
      height: 180,
    });
  });
});
