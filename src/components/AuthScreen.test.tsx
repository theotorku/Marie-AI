import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthScreen from "./AuthScreen";

const mockLogin = vi.fn().mockResolvedValue(null);
const mockRegister = vi.fn().mockResolvedValue(null);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthScreen", () => {
  it("renders login form by default", () => {
    render(<AuthScreen onLogin={mockLogin} onRegister={mockRegister} />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("switches to register mode", async () => {
    render(<AuthScreen onLogin={mockLogin} onRegister={mockRegister} />);
    await userEvent.click(screen.getByText(/sign up/i));
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("calls onLogin on form submit", async () => {
    render(<AuthScreen onLogin={mockLogin} onRegister={mockRegister} />);
    await userEvent.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("displays error message from login", async () => {
    mockLogin.mockResolvedValueOnce("Invalid email or password.");
    render(<AuthScreen onLogin={mockLogin} onRegister={mockRegister} />);
    await userEvent.type(screen.getByPlaceholderText("Email address"), "bad@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });
});
