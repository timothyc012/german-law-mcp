import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "../../src/lib/http-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWithRetry", () => {
  it("adds the project User-Agent header when none is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithRetry("https://example.test", {}, { retries: 0 });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("User-Agent")).toContain("german-law-mcp/0.7.0");
  });

  it("preserves a caller-provided User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithRetry(
      "https://example.test",
      { headers: { "User-Agent": "custom-agent" } },
      { retries: 0 },
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("User-Agent")).toBe("custom-agent");
  });

  it("retries retryable server responses once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithRetry(
      "https://example.test",
      {},
      { retries: 1, backoffMs: 0 },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves caller abort signals while adding a timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await fetchWithRetry(
      "https://example.test",
      { signal: controller.signal },
      { retries: 0, timeoutMs: 1_000 },
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const signal = init.signal as AbortSignal;
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("does not retry aborted requests", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry(
      "https://example.test",
      {},
      { retries: 1, backoffMs: 0 },
    )).rejects.toThrow("cancelled");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("honors caller cancellation during retry backoff", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    const promise = fetchWithRetry(
      "https://example.test",
      { signal: controller.signal },
      { retries: 1, backoffMs: 50 },
    );
    setTimeout(() => controller.abort(), 0);

    await expect(promise).rejects.toThrow("Request aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
