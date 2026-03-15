import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskItem from "./TaskItem";
import type { Task } from "../types";

const baseTask: Task = {
  id: 1,
  text: "Review samples",
  priority: "high",
  done: false,
};

describe("TaskItem", () => {
  it("renders task text and priority", () => {
    render(<TaskItem task={baseTask} onToggle={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("Review samples")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("calls onToggle when checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={() => {}} />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[0]); // checkbox is the first button
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<TaskItem task={baseTask} onToggle={() => {}} onDelete={onDelete} />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]); // delete is last button
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows checkmark when task is done", () => {
    const doneTask = { ...baseTask, done: true };
    render(<TaskItem task={doneTask} onToggle={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });
});
