import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("updates the authenticated user immutably", async () => {
    const fetchedUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Theo",
      onboarding_completed: false,
    };

    localStorage.setItem("marie_token", "token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ user: fetchedUser }),
    } as Response);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    const previousUser = result.current.user;

    act(() => {
      result.current.updateUser({ onboarding_completed: true });
    });

    expect(previousUser?.onboarding_completed).toBe(false);
    expect(result.current.user?.onboarding_completed).toBe(true);
    expect(result.current.user).not.toBe(previousUser);
    expect(fetchedUser.onboarding_completed).toBe(false);
  });
});