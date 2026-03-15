import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickAction from "./QuickAction";

describe("QuickAction", () => {
  it("renders label text", () => {
    render(<QuickAction label="Draft email" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /draft email/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<QuickAction label="Click me" onClick={handleClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
