import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";

// Mock fetch to handle both /api/messages (load/persist) and /api/chat calls
function mockFetch(...responses: Array<{ ok: boolean; status?: number; json: () => Promise<unknown> }>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

    // Initial history load — return empty
    if (url.endsWith("/api/messages") && queue.length > 0) {
      // GET requests for loading or POST for persisting
      return { ok: true, json: async () => ({ messages: [] }) } as Response;
    }

    // Chat API call — return queued response
    if (url.endsWith("/api/chat") && queue.length > 0) {
      return queue.shift() as Response;
    }

    return { ok: true, json: async () => ({}) } as Response;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useChat", () => {
  it("starts with initial greeting message", () => {
    mockFetch();
    const { result } = renderHook(() => useChat("test-token"));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("assistant");
    expect(result.current.messages[0].content).toContain("Marie AI");
  });

  it("is not loading initially", () => {
    mockFetch();
    const { result } = renderHook(() => useChat("test-token"));
    expect(result.current.loading).toBe(false);
  });

  it("has no error initially", () => {
    mockFetch();
    const { result } = renderHook(() => useChat("test-token"));
    expect(result.current.error).toBeNull();
  });

  it("ignores empty messages", async () => {
    mockFetch();
    const { result } = renderHook(() => useChat("test-token"));
    await act(async () => {
      await result.current.sendMessage("   ");
    });
    expect(result.current.messages).toHaveLength(1);
  });

  it("adds user message and handles API failure gracefully", async () => {
    const spy = mockFetch();
    // Override to reject on /api/chat
    spy.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : "";
      if (url.endsWith("/api/chat")) throw new Error("Network error");
      return { ok: true, json: async () => ({ messages: [] }) } as Response;
    });

    const { result } = renderHook(() => useChat("test-token"));
    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[1].role).toBe("user");
    expect(result.current.messages[1].content).toBe("Hello");
    expect(result.current.messages[2].role).toBe("assistant");
    expect(result.current.messages[2].content).toContain("Network error");
    expect(result.current.loading).toBe(false);
  });

  it("adds assistant reply on successful API response", async () => {
    mockFetch({
      ok: true,
      json: async () => ({ content: [{ text: "Hi there!" }] }),
    });

    const { result } = renderHook(() => useChat("test-token"));
    await act(async () => {
      await result.current.sendMessage("Hey");
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].content).toBe("Hi there!");
  });

  it("persists messages to Supabase via API", async () => {
    const spy = mockFetch({
      ok: true,
      json: async () => ({ content: [{ text: "Saved reply" }] }),
    });

    const { result } = renderHook(() => useChat("test-token"));
    await act(async () => {
      await result.current.sendMessage("Save this");
    });

    // Verify POST /api/messages was called (for user + assistant messages)
    const persistCalls = spy.mock.calls.filter(
      ([url, opts]) => typeof url === "string" && url.endsWith("/api/messages") && opts?.method === "POST"
    );
    expect(persistCalls.length).toBe(2); // user msg + assistant msg
  });

  it("rejects messages over the character limit", async () => {
    mockFetch();
    const { result } = renderHook(() => useChat("test-token"));
    const longMessage = "a".repeat(2001);
    await act(async () => {
      await result.current.sendMessage(longMessage);
    });

    expect(result.current.error).toContain("too long");
    expect(result.current.messages).toHaveLength(1);
  });

  it("surfaces rate limit error from 429 response", async () => {
    mockFetch({
      ok: false,
      status: 429,
      json: async () => ({ error: "Rate limit exceeded. Try again in 45s." }),
    });

    const { result } = renderHook(() => useChat("test-token"));
    await act(async () => {
      await result.current.sendMessage("Too fast");
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].content).toContain("Rate limit exceeded");
  });
});
