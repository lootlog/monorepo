import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

const SimpleButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
};

describe("SimpleButton Component Example", () => {
  it("should render button with correct text", () => {
    render(<SimpleButton onClick={() => {}}>Click me</SimpleButton>);

    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    render(<SimpleButton onClick={handleClick}>Click me</SimpleButton>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(clicked).toBe(true);
  });

  it("should render children correctly", () => {
    render(
      <SimpleButton onClick={() => {}}>
        <span>Complex Child</span>
      </SimpleButton>,
    );

    expect(screen.getByText("Complex Child")).toBeInTheDocument();
  });
});
