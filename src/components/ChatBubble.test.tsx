import { render, screen } from "@testing-library/react";
import ChatBubble from "./ChatBubble";

describe("ChatBubble", () => {
  it("renders message content", () => {
    render(<ChatBubble role="user" content="Hello there" />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders assistant messages", () => {
    render(<ChatBubble role="assistant" content="Hi! How can I help?" />);
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });
});
