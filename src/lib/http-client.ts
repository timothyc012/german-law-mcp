const DEFAULT_USER_AGENT = "german-law-mcp/0.7.0 (+https://github.com/timothyc012/german-law-mcp)";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface FetchWithRetryOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  source?: string;
}

function abortError(): DOMException {
  return new DOMException("Request aborted", "AbortError");
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function withDefaultHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  if (!merged.has("User-Agent")) {
    merged.set("User-Agent", DEFAULT_USER_AGENT);
  }
  return merged;
}

function withTimeoutSignal(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function describeFailure(source: string | undefined, error: unknown): string {
  const prefix = source ? `${source} request failed` : "HTTP request failed";
  const message = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${message}`;
}

function isAbortLikeError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
}

export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? 1;
  const backoffMs = options.backoffMs ?? 300;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (init.signal?.aborted) {
      throw new Error(describeFailure(options.source, abortError()));
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: withDefaultHeaders(init.headers),
        signal: withTimeoutSignal(init.signal, timeoutMs),
      });

      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (isAbortLikeError(error) || attempt === retries) {
        throw new Error(describeFailure(options.source, error));
      }
    }

    try {
      await sleep(backoffMs * 2 ** attempt, init.signal);
    } catch (error) {
      throw new Error(describeFailure(options.source, error));
    }
  }

  throw new Error(describeFailure(options.source, lastError));
}
